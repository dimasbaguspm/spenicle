package captures

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
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
	blobs     ArtifactStore
	artifacts ArtifactRows
	recurring RecurringSource
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
	blobs ArtifactStore,
	artifacts ArtifactRows,
	extractor extraction.Extractor,
	recurring RecurringSource,
	clock TimeSource,
	ids IDSource,
) *Service {
	return &Service{
		captures: captures, entries: entries, sealer: sealer, blobs: blobs, artifacts: artifacts,
		extractor: extractor, recurring: recurring, clock: clock, ids: ids,
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

	stored, err = s.storeArtifact(ctx, stored, in.Artifact)
	if err != nil {
		return entity.Capture{}, false, err
	}

	stored, err = s.extract(ctx, stored, artifactOf(in))
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

	err = approvable(&capture)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	ruleID, err := s.recurringRuleID(ctx, capture)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	postings := approvalPostings(in.Postings)

	entry, created, err := s.entries.Build(ctx, ledger.PostInput{
		OccurredOn:      in.OccurredOn,
		Note:            in.Note,
		PayeeRef:        in.PayeeRef,
		Currency:        in.Currency,
		Source:          sourceOf(capture.Kind),
		RecurringRuleID: ruleID,
		Postings:        postings,
	})
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	if !created {
		return entity.Entry{}, entity.Capture{}, fmt.Errorf(
			"%w: the entry already exists", entity.ErrDuplicate,
		)
	}

	now := s.clock.Now()
	capture.Status = constant.CaptureStatusApproved
	capture.ResolutionNote = ""
	capture.ResolvedAt = &now

	saved, err := s.captures.Approve(ctx, capture, entry)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	capture.ResolvedEntryID = &saved.ID

	telemetry.RecordLedgerPost(ctx, saved.Source, int64(len(saved.Postings)))
	telemetry.RecordCaptureTransition(ctx, capture.Kind, constant.CaptureStatusApproved)

	reloaded, found, err := s.captures.CaptureByRef(ctx, capture.Ref)
	if err != nil {
		return entity.Entry{}, entity.Capture{}, err
	}

	if !found {
		return entity.Entry{}, entity.Capture{}, fmt.Errorf("%w: capture %s", entity.ErrNotFound, capture.Ref)
	}

	resolved, err := s.open(ctx, reloaded)

	return saved, resolved, err
}

func approvalPostings(postings []PostingInput) []ledger.PostingInput {
	out := make([]ledger.PostingInput, 0, len(postings))
	for _, posting := range postings {
		out = append(out, ledger.PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: posting.AmountMinor,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return out
}

func approvable(capture *entity.Capture) error {
	const approved = constant.CaptureStatusApproved
	if err := capture.Transition(approved); err == nil {
		capture.Status = approved

		return nil
	}

	switch capture.Status {
	case constant.CaptureStatusFailed, constant.CaptureStatusExtracting:
		capture.Status = constant.CaptureStatusPending
		if err := capture.Transition(approved); err != nil {
			return err
		}

		capture.Status = approved

		return nil
	default:
		return fmt.Errorf("%w: %s to %s", entity.ErrInvalidState, capture.Status, approved)
	}
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

func (s *Service) Match(ctx context.Context, ref, entryRef string) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Match")
	defer endSpan()

	capture, err := s.pending(ctx, ref)
	if err != nil {
		return entity.Capture{}, err
	}

	entry, err := s.entries.Get(ctx, entryRef)
	if err != nil {
		return entity.Capture{}, err
	}

	note, err := s.sealText(ctx, "matched "+entry.Ref)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.resolve(ctx, capture, constant.CaptureStatusDuplicate, note, &entry.ID)
}

func (s *Service) Retry(ctx context.Context, ref string) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Retry")
	defer endSpan()

	capture, err := s.pending(ctx, ref)
	if err != nil {
		return entity.Capture{}, err
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

	updated, err := s.applyReport(ctx, capture, report, true)
	if err != nil {
		return entity.Capture{}, err
	}

	return s.open(ctx, updated)
}

func (s *Service) Enqueue(ctx context.Context, in EnqueueInput) (entity.Capture, bool, error) {
	return enqueue(ctx, s.captures, s.sealer, s.clock, in)
}

func (s *Service) storeArtifact(
	ctx context.Context,
	capture entity.Capture,
	artifact *extraction.Artifact,
) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.StoreArtifact")
	defer endSpan()

	if s.blobs == nil || artifact == nil || len(artifact.Bytes) == 0 {
		return capture, nil
	}

	record, err := s.blobs.Put(ctx, *artifact)
	if err != nil {
		return entity.Capture{}, fmt.Errorf("store artifact: %w", err)
	}

	if _, err := s.artifacts.InsertArtifact(ctx, entity.Artifact{
		CaptureRef:  capture.Ref,
		SHA256:      record.SHA256,
		ContentType: record.ContentType,
		Filename:    record.Filename,
		PlainBytes:  record.PlainBytes,
		StoredBytes: record.StoredBytes,
		CreatedAt:   s.clock.Now(),
	}); err != nil {
		return entity.Capture{}, fmt.Errorf("record artifact: %w", err)
	}

	return capture, nil
}

// artifactOf is what the rail reads: the uploaded file when there is one, else the text
// itself, because SnapToJSON extracts an email or a pasted body as readily as a document.
func artifactOf(in CreateInput) *extraction.Artifact {
	if in.Artifact != nil {
		return in.Artifact
	}

	if strings.TrimSpace(in.RawText) == "" {
		return nil
	}

	return &extraction.Artifact{
		Filename:    "capture.txt",
		ContentType: "text/plain; charset=utf-8",
		Bytes:       []byte(in.RawText),
	}
}

func (s *Service) extract(
	ctx context.Context,
	capture entity.Capture,
	artifact *extraction.Artifact,
) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Extract")
	defer endSpan()

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

	return s.applyReport(ctx, capture, report, false)
}

func (s *Service) applyReport(
	ctx context.Context,
	capture entity.Capture,
	report extraction.Report,
	unresolvedOnly bool,
) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.ApplyReport")
	defer endSpan()

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

	if unresolvedOnly {
		return s.captures.UpdateCaptureIfUnresolved(ctx, capture)
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
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Resolve")
	defer endSpan()

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

	reloaded, found, readErr := s.captures.CaptureByRef(ctx, updated.Ref)
	if readErr != nil {
		return entity.Capture{}, readErr
	}

	if found {
		updated = reloaded
	}

	telemetry.RecordCaptureTransition(ctx, updated.Kind, status)

	return s.open(ctx, updated)
}

func (s *Service) open(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	return openCapture(ctx, s.sealer, capture)
}

func (s *Service) sealText(ctx context.Context, plain string) (string, error) {
	return sealTextWith(ctx, s.sealer, plain)
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

// recurringRuleID links an approval back to the rule that queued it, so
// (recurring_rule_id, occurred_on) stays unique and a replay cannot double-post.
func (s *Service) recurringRuleID(ctx context.Context, capture entity.Capture) (*int64, error) {
	ruleRef, err := s.recurringRuleRef(ctx, capture)
	if err != nil {
		return nil, err
	}

	if ruleRef == "" || s.recurring == nil {
		return nil, nil //nolint:nilnil // a capture that names no rule needs no link
	}

	rule, found, err := s.recurring.RecurringByRef(ctx, ruleRef)
	if err != nil {
		return nil, err
	}

	if !found {
		return nil, nil //nolint:nilnil // the rule is gone, the approval still stands
	}

	return &rule.ID, nil
}

func (s *Service) recurringRuleRef(ctx context.Context, capture entity.Capture) (string, error) {
	if capture.Kind != constant.CaptureKindRecurring {
		return "", nil
	}

	plain, err := openTextWith(ctx, s.sealer, capture.DraftJSON)
	if err != nil {
		return "", err
	}

	var draft entity.RecurringDraft
	if unmarshalErr := json.Unmarshal([]byte(plain), &draft); unmarshalErr != nil {
		return "", nil //nolint:nilerr // an unreadable draft is still approvable
	}

	return draft.RuleRef, nil
}

type queue struct {
	captures repository.Captures
	sealer   seal.Sealer
	clock    TimeSource
}

// NewQueue builds the worker's half of the module: the recurring rules write
// into the queue through it, and it holds no ledger contract to write with.
//
//nolint:ireturn // the worker wants the Queue surface, not the concrete type
func NewQueue(captures repository.Captures, sealer seal.Sealer, clock TimeSource) Queue {
	return &queue{captures: captures, sealer: sealer, clock: clock}
}

func (q *queue) Enqueue(ctx context.Context, in EnqueueInput) (entity.Capture, bool, error) {
	return enqueue(ctx, q.captures, q.sealer, q.clock, in)
}

func enqueue(
	ctx context.Context,
	captures repository.Captures,
	sealer seal.Sealer,
	clock TimeSource,
	in EnqueueInput,
) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Captures.Enqueue")
	defer endSpan()

	key := recurringDedupeKey(in.RuleRef, in.OccurredOn)

	existing, found, err := captures.CaptureByDedupeKey(ctx, key)
	if err != nil {
		return entity.Capture{}, false, err
	}

	if found {
		opened, openErr := openCapture(ctx, sealer, existing)

		return opened, false, openErr
	}

	sealed, err := sealDraft(ctx, sealer, in)
	if err != nil {
		return entity.Capture{}, false, err
	}

	receivedAt := in.ReceivedAt
	if receivedAt.IsZero() {
		receivedAt = clock.Now()
	}

	stored, err := captures.InsertCapture(ctx, entity.Capture{
		Kind:       constant.CaptureKindRecurring,
		Status:     constant.CaptureStatusPending,
		DedupeKey:  key,
		DraftJSON:  sealed,
		ReceivedAt: receivedAt,
	})
	if err != nil {
		// two runs can race on the same due date: the unique dedupe_key decides
		raced, racedFound, lookErr := captures.CaptureByDedupeKey(ctx, key)
		if lookErr != nil || !racedFound {
			return entity.Capture{}, false, err
		}

		opened, openErr := openCapture(ctx, sealer, raced)

		return opened, false, openErr
	}

	opened, err := openCapture(ctx, sealer, stored)

	return opened, true, err
}

// recurringDedupeKey is the cross-run idempotency of one rule and one due date:
// the same occurrence queued twice is one row, however often the worker ticks.
func recurringDedupeKey(ruleRef string, due time.Time) string {
	joined := strings.Join([]string{"recurring", ruleRef, due.Format(constant.DateLayout)}, "\x00")

	sum := sha256.Sum256([]byte(joined))

	return hex.EncodeToString(sum[:])
}

func sealDraft(ctx context.Context, sealer seal.Sealer, in EnqueueInput) (string, error) {
	draft, err := json.Marshal(entity.RecurringDraft{
		RuleRef:     in.RuleRef,
		PayeeRef:    in.PayeeRef,
		AccountRef:  in.AccountRef,
		CategoryRef: in.CategoryRef,
		AmountMinor: strconv.FormatInt(in.AmountMinor, 10),
		Currency:    in.Currency,
		DueOn:       in.OccurredOn.Format(constant.DateLayout),
	})
	if err != nil {
		return "", fmt.Errorf("encode recurring draft: %w", err)
	}

	return sealTextWith(ctx, sealer, string(draft))
}

func openCapture(ctx context.Context, sealer seal.Sealer, capture entity.Capture) (entity.Capture, error) {
	var err error

	if capture.RawText, err = openTextWith(ctx, sealer, capture.RawText); err != nil {
		return entity.Capture{}, err
	}

	if capture.ResolutionNote, err = openTextWith(ctx, sealer, capture.ResolutionNote); err != nil {
		return entity.Capture{}, err
	}

	if capture.DraftJSON, err = openTextWith(ctx, sealer, capture.DraftJSON); err != nil {
		return entity.Capture{}, err
	}

	return capture, nil
}

func sealTextWith(ctx context.Context, sealer seal.Sealer, plain string) (string, error) {
	if strings.TrimSpace(plain) == "" {
		return "", nil
	}

	sealed, err := sealer.Seal(ctx, []byte(plain))
	if err != nil {
		return "", fmt.Errorf("seal capture text: %w", err)
	}

	return sealed, nil
}

func openTextWith(ctx context.Context, sealer seal.Sealer, sealed string) (string, error) {
	if strings.TrimSpace(sealed) == "" {
		return "", nil
	}

	plain, err := sealer.Open(ctx, sealed)
	if err != nil {
		// a capture written before APP_SECRET existed stays readable as a row
		if errors.Is(err, seal.ErrNoSecret) {
			return "", nil
		}

		return "", fmt.Errorf("open capture text: %w", err)
	}

	return string(plain), nil
}
