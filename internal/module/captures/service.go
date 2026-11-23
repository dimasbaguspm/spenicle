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

type Service struct {
	captures  repository.Captures
	entries   ledger.Contract
	sealer    seal.Sealer
	clock     TimeSource
	ids       IDSource
	extractor extraction.Extractor
}

type (
	TimeSource interface{ Now() time.Time }
	IDSource   interface{ NewID() string }
)

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

func (s *Service) Approve(
	ctx context.Context,
	ref string,
	in ApproveInput,
) (entity.Entry, entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Approve")
	defer endSpan()

	capture, err := s.pending(ctx, ref)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	postings := make([]ledger.PostingInput, 0, len(in.Postings))
	for _, posting := range in.Postings {
		postings = append(postings, ledger.PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: posting.AmountMinor,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	entry, _, err := s.entries.Post(ctx, ledger.PostInput{
		OccurredOn: in.OccurredOn,
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

func (s *Service) Reject(ctx context.Context, ref, reason string) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Reject")
	defer endSpan()

	capture, err := s.pending(ctx, ref)
	if err != nil {
		return entity.Capture{}, err
	}

	sealedNote, err := s.sealText(ctx, reason)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.resolve(ctx, capture, constant.CaptureStatusRejected, sealedNote, nil)
}

func (s *Service) Retry(ctx context.Context, ref string) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Retry")
	defer endSpan()

	capture, found, err := s.captures.CaptureByRef(ctx, ref)
	if err != nil {
		return entity.Capture{}, err
	}

	if !found {
		return entity.Capture{}, fmt.Errorf("%w: capture %s", entity.ErrNotFound, ref)
	}

	if s.extractor == nil {
		return entity.Capture{}, fmt.Errorf("%w: no extraction rail is configured", entity.ErrInvalidState)
	}

	if capture.JobRef == "" {
		return entity.Capture{}, fmt.Errorf("%w: capture %s was never submitted", entity.ErrInvalidState, ref)
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
		capture.ExtractionRail = s.extractor.Rail()
		capture.ExtractionModel = s.extractor.Model()
		capture.ExtractionError = err.Error()

		return s.captures.UpdateCapture(ctx, capture)
	}

	return s.applyReport(ctx, capture, report)
}

func (s *Service) applyReport(
	ctx context.Context,
	capture entity.Capture,
	report extraction.Report,
) (entity.Capture, error) {
	capture.JobRef = report.JobRef
	capture.ExtractionRail = report.Rail
	capture.ExtractionModel = report.Model

	switch report.Status {
	case extraction.StatusCompleted:
		capture.Status = constant.CaptureStatusPending
		capture.ExtractionError = ""

		draft, err := json.Marshal(draftEnvelope{
			Data:       report.Data,
			Valid:      report.Valid,
			Violations: report.Violations,
		})
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

func (s *Service) pending(ctx context.Context, ref string) (entity.Capture, error) {
	capture, found, err := s.captures.CaptureByRef(ctx, ref)
	if err != nil {
		return entity.Capture{}, err
	}

	if !found {
		return entity.Capture{}, fmt.Errorf("%w: capture %s", entity.ErrNotFound, ref)
	}

	if capture.IsResolved() {
		return entity.Capture{}, fmt.Errorf("%w: %s", entity.ErrCaptureResolved, capture.Status)
	}

	return capture, nil
}

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

type draftEnvelope struct {
	Data       json.RawMessage        `json:"data,omitempty"`
	Valid      bool                   `json:"valid"`
	Violations []extraction.Violation `json:"violations,omitempty"`
}

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
