package captures

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

// Service owns the review queue.
type Service struct {
	captures repository.Captures
	entries  ledger.Contract
	sealer   seal.Sealer
	clock    TimeSource
	ids      IDSource
	// extractor is whichever rail is configured, or nil. Nil is a supported mode:
	// captures stay raw and the user types the fields. The module never learns the
	// vendor's name — the rail reports it, and it is stored with the draft.
	extractor extraction.Extractor
}

// TimeSource and IDSource are the module's ambient dependencies; clock.System
// satisfies both.
type (
	TimeSource interface{ Now() time.Time }
	IDSource   interface{ NewID() string }
)

// New wires the module.
func New(
	captures repository.Captures,
	entries ledger.Contract,
	sealer seal.Sealer,
	extractor extraction.Extractor,
	clock TimeSource,
	ids IDSource,
) *Service {
	return &Service{
		captures: captures, entries: entries, sealer: sealer,
		extractor: extractor, clock: clock, ids: ids,
	}
}

var _ Contract = (*Service)(nil)

// Create queues a capture. The payload is sealed before it reaches the database, so
// a stolen file does not leak a bank email.
func (s *Service) Create(ctx context.Context, in CreateInput) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Create")
	defer endSpan()

	if !knownKind(in.Kind) {
		return entity.Capture{}, false, fmt.Errorf("%w: %q", entity.ErrUnknownCaptureKind, in.Kind)
	}

	key := dedupeKey(in)

	existing, found, err := s.captures.CaptureByDedupeKey(ctx, key)
	if err != nil {
		return entity.Capture{}, false, err
	}

	if found {
		opened, openErr := s.open(ctx, existing)

		return opened, false, openErr
	}

	rawText, err := s.sealText(ctx, in.RawText)
	if err != nil {
		return entity.Capture{}, false, err
	}

	receivedAt := in.ReceivedAt
	if receivedAt.IsZero() {
		receivedAt = s.clock.Now()
	}

	stored, err := s.captures.InsertCapture(ctx, entity.Capture{
		Kind:         in.Kind,
		Status:       constant.CaptureStatusPending,
		ClientID:     in.ClientID,
		DedupeKey:    key,
		BatchID:      in.BatchID,
		ArtifactHash: in.ArtifactHash,
		RawText:      rawText,
		ReceivedAt:   receivedAt,
	})
	if err != nil {
		return entity.Capture{}, false, err
	}

	stored, err = s.extract(ctx, stored, in.Artifact)
	if err != nil {
		return entity.Capture{}, false, err
	}

	opened, err := s.open(ctx, stored)

	return opened, true, err
}

// List returns the queue, seal opened so a review screen can show the text.
func (s *Service) List(
	ctx context.Context,
	filter entity.CaptureFilter,
) ([]entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.List")
	defer endSpan()

	stored, err := s.captures.ListCaptures(ctx, filter)
	if err != nil {
		return nil, err
	}

	out := make([]entity.Capture, 0, len(stored))

	for _, capture := range stored {
		opened, openErr := s.open(ctx, capture)
		if openErr != nil {
			return nil, openErr
		}

		out = append(out, opened)
	}

	return out, nil
}

// Approve posts the entry and resolves the capture. Ordering matters: if the post
// fails, the capture stays in the queue.
func (s *Service) Approve(
	ctx context.Context,
	id int64,
	in ApproveInput,
) (entity.Entry, entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Approve")
	defer endSpan()

	capture, err := s.pending(ctx, id)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	postings := make([]ledger.PostingInput, 0, len(in.Postings))
	for _, posting := range in.Postings {
		postings = append(postings, ledger.PostingInput{
			AccountID:   posting.AccountID,
			AmountMinor: posting.AmountMinor,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	entry, _, err := s.entries.Post(ctx, ledger.PostInput{
		OccurredOn: in.OccurredOn,
		PayeeID:    in.PayeeID,
		Note:       in.Note,
		Currency:   in.Currency,
		Source:     sourceOf(capture.Kind),
		Postings:   postings,
	})
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	resolved, err := s.resolve(ctx, capture, constant.CaptureStatusApproved, "", &entry.ID)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	return entry, resolved, nil
}

// Reject takes a capture out of the queue without touching the ledger. The reason
// is sealed like every other note.
func (s *Service) Reject(ctx context.Context, id int64, reason string) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Reject")
	defer endSpan()

	capture, err := s.pending(ctx, id)
	if err != nil {
		return entity.Capture{}, err
	}

	sealedNote, err := s.sealText(ctx, reason)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.resolve(ctx, capture, constant.CaptureStatusRejected, sealedNote, nil)
}

// Retry reads a snap back. A capture that never reached the vendor has nothing to
// retry, and says so instead of silently doing nothing.
func (s *Service) Retry(ctx context.Context, id int64) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Retry")
	defer endSpan()

	capture, found, err := s.captures.CaptureByID(ctx, id)
	if err != nil {
		return entity.Capture{}, err
	}

	if !found {
		return entity.Capture{}, fmt.Errorf("%w: capture %d", entity.ErrNotFound, id)
	}

	if s.extractor == nil {
		return entity.Capture{}, fmt.Errorf("%w: no extraction rail is configured", entity.ErrInvalidState)
	}

	if capture.JobRef == "" {
		return entity.Capture{}, fmt.Errorf("%w: capture %d was never submitted", entity.ErrInvalidState, id)
	}

	report, err := s.extractor.Poll(ctx, capture.JobRef)
	if errors.Is(err, extraction.ErrNoPolling) {
		return entity.Capture{}, fmt.Errorf(
			"%w: the %s rail answers in one call, there is nothing to poll",
			entity.ErrInvalidState, capture.ExtractionRail,
		)
	}

	if err != nil {
		return entity.Capture{}, err
	}

	updated, err := s.applyReport(ctx, capture, report)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.open(ctx, updated)
}

// extract submits an artifact when both the vendor and the document exist. Every
// failure is recorded on the capture, never raised: a vendor outage must not lose
// the receipt the user just shared.
func (s *Service) extract(
	ctx context.Context,
	capture entity.Capture,
	artifact *extraction.Artifact,
) (entity.Capture, error) {
	if s.extractor == nil || artifact == nil {
		return capture, nil
	}

	report, err := s.extractor.Submit(ctx, *artifact)
	if err != nil {
		// A rail that refuses or fails must not lose the document the user just
		// handed over: the capture stays, the reason is recorded on it.
		capture.ExtractionRail = s.extractor.Rail()
		capture.ExtractionError = err.Error()

		return s.captures.UpdateCapture(ctx, capture)
	}

	return s.applyReport(ctx, capture, report)
}

// applyReport maps the vendor's four states onto the queue's statuses, sealing the
// draft so the fields the vendor read never sit in plaintext.
// applyReport maps the unified report onto the queue's statuses. One switch for every
// rail: a new vendor cannot invent a new capture state.
func (s *Service) applyReport(
	ctx context.Context,
	capture entity.Capture,
	report extraction.Report,
) (entity.Capture, error) {
	capture.JobRef = report.JobRef
	capture.ExtractionRail = report.Rail

	switch report.Status {
	case extraction.StatusCompleted:
		capture.Status = constant.CaptureStatusPending
		capture.ExtractionError = ""

		draft, err := json.Marshal(struct {
			Data       json.RawMessage        `json:"data,omitempty"`
			Valid      bool                   `json:"valid"`
			Violations []extraction.Violation `json:"violations,omitempty"`
		}{Data: report.Data, Valid: report.Valid, Violations: report.Violations})
		if err != nil {
			return entity.Capture{}, fmt.Errorf("encode draft: %w", err)
		}

		if capture.DraftJSON, err = s.sealText(ctx, string(draft)); err != nil {
			return entity.Capture{}, err
		}

	case extraction.StatusFailed:
		capture.Status = constant.CaptureStatusFailed
		capture.ExtractionError = report.Error

	case extraction.StatusRunning:
		capture.Status = constant.CaptureStatusExtracting

	default:
		capture.Status = constant.CaptureStatusFailed
		capture.ExtractionError = "unknown rail status " + report.Status
	}

	return s.captures.UpdateCapture(ctx, capture)
}

// pending loads a capture that is still allowed to move.
func (s *Service) pending(ctx context.Context, id int64) (entity.Capture, error) {
	capture, found, err := s.captures.CaptureByID(ctx, id)
	if err != nil {
		return entity.Capture{}, err
	}

	if !found {
		return entity.Capture{}, fmt.Errorf("%w: capture %d", entity.ErrNotFound, id)
	}

	if capture.IsResolved() {
		return entity.Capture{}, fmt.Errorf("%w: %s", entity.ErrCaptureResolved, capture.Status)
	}

	return capture, nil
}

// resolve writes the terminal state once, and audits the decision.
func (s *Service) resolve(
	ctx context.Context,
	capture entity.Capture,
	status, note string,
	entryID *int64,
) (entity.Capture, error) {
	if err := capture.Transition(status); err != nil {
		return entity.Capture{}, err
	}

	now := s.clock.Now()

	capture.Status = status
	capture.ResolutionNote = note
	capture.ResolvedEntryID = entryID
	capture.ResolvedAt = &now

	updated, err := s.captures.UpdateCapture(ctx, capture)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.open(ctx, updated)
}

// open unseals the payloads a caller needs. A payload that cannot be opened (the
// secret changed) is reported as an empty string, not as a failed read: the queue
// item itself is still usable.
func (s *Service) open(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	var err error

	if capture.RawText, err = s.openText(ctx, capture.RawText); err != nil {
		return entity.Capture{}, err
	}

	if capture.ResolutionNote, err = s.openText(ctx, capture.ResolutionNote); err != nil {
		return entity.Capture{}, err
	}

	if capture.DraftJSON, err = s.openText(ctx, capture.DraftJSON); err != nil {
		return entity.Capture{}, err
	}

	return capture, nil
}

func (s *Service) sealText(ctx context.Context, plain string) (string, error) {
	if strings.TrimSpace(plain) == "" {
		return "", nil
	}

	sealed, err := s.sealer.Seal(ctx, []byte(plain))
	if err != nil {
		return "", fmt.Errorf("seal capture text: %w", err)
	}

	return sealed, nil
}

func (s *Service) openText(ctx context.Context, sealed string) (string, error) {
	if strings.TrimSpace(sealed) == "" {
		return "", nil
	}

	plain, err := s.sealer.Open(ctx, sealed)
	if err != nil {
		if errors.Is(err, seal.ErrNoSecret) {
			return "", nil
		}

		return "", fmt.Errorf("open capture text: %w", err)
	}

	return string(plain), nil
}

// dedupeKey is what makes "the same receipt twice" one row. A client id, when
// present, is part of it: two genuinely different captures may share a text body.
func dedupeKey(in CreateInput) string {
	joined := strings.Join([]string{
		in.Kind, in.ClientID, in.ArtifactHash, in.RawText,
	}, "\x00")

	sum := sha256.Sum256([]byte(joined))

	return hex.EncodeToString(sum[:])
}

func knownKind(kind string) bool {
	switch kind {
	case constant.CaptureKindShare, constant.CaptureKindImage, constant.CaptureKindEmail,
		constant.CaptureKindStatement, constant.CaptureKindRecurring, constant.CaptureKindManual:
		return true
	default:
		return false
	}
}

// sourceOf records where an approved entry came from, so provenance is not guessed
// later.
func sourceOf(kind string) string {
	switch kind {
	case constant.CaptureKindShare:
		return constant.EntrySourceShare
	case constant.CaptureKindImage:
		return constant.EntrySourceShare
	case constant.CaptureKindEmail:
		return constant.EntrySourceEmail
	case constant.CaptureKindStatement:
		return constant.EntrySourceStatement
	case constant.CaptureKindRecurring:
		return constant.EntrySourceRecurring
	default:
		return constant.EntrySourceManual
	}
}
