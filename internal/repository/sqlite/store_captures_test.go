package sqlite_test

import (
	"errors"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func seedCapture(t *testing.T, store *sqlite.Store, status string) entity.Capture {
	t.Helper()

	capture, err := store.InsertCapture(t.Context(), entity.Capture{
		Kind:       constant.CaptureKindManual,
		Status:     status,
		DedupeKey:  uuid.New(),
		RawText:    "coffee",
		ReceivedAt: time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("insert capture: %v", err)
	}

	return capture
}

func approvalEntry(t *testing.T, asset, expense entity.Account, currency string) entity.Entry {
	t.Helper()

	entry := entity.Entry{
		OccurredOn: time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC),
		Currency:   currency,
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{
				AccountID:       expense.ID,
				AmountMinor:     25_000,
				BaseAmountMinor: 25_000,
				FXRate:          "1",
				FXSource:        constant.FXSourceIdentity,
			},
			{
				AccountID:       asset.ID,
				AmountMinor:     -25_000,
				BaseAmountMinor: -25_000,
				FXRate:          "1",
				FXSource:        constant.FXSourceIdentity,
			},
		},
	}
	if err := entity.CheckZeroSum(entry.Postings); err != nil {
		t.Fatalf("unbalanced test entry: %v", err)
	}

	return entry
}

func countRows(t *testing.T, store *sqlite.Store, query string, args ...any) int {
	t.Helper()

	var count int
	if err := store.DB().QueryRowContext(t.Context(), query, args...).Scan(&count); err != nil {
		t.Fatalf("count rows: %v", err)
	}

	return count
}

func assertUnapproved(t *testing.T, store *sqlite.Store, err error) {
	t.Helper()

	if !errors.Is(err, entity.ErrCaptureResolved) {
		t.Fatalf("err = %v, want capture_resolved", err)
	}
	if got := countRows(t, store, `SELECT COUNT(*) FROM ledger_entries`); got != 0 {
		t.Fatalf("entries = %d, want 0", got)
	}
}

func assertApproved(
	t *testing.T,
	store *sqlite.Store,
	capture entity.Capture,
	saved entity.Entry,
	err error,
) {
	t.Helper()

	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	if saved.ID == 0 || saved.Ref == "" {
		t.Fatal("the approved entry was not returned with an id and ref")
	}

	stored, found, err := store.CaptureByRef(t.Context(), capture.Ref)
	if err != nil || !found {
		t.Fatalf("read capture: found=%v err=%v", found, err)
	}
	if stored.Status != constant.CaptureStatusApproved {
		t.Fatalf("status = %q, want approved", stored.Status)
	}
	if stored.ResolvedEntryID == nil || *stored.ResolvedEntryID != saved.ID {
		t.Fatalf("resolved_entry_id = %v, want %d", stored.ResolvedEntryID, saved.ID)
	}
	if stored.ResolvedEntryRef != saved.Ref {
		t.Fatalf("resolved_entry_ref = %q, want %q", stored.ResolvedEntryRef, saved.Ref)
	}
	if got := countRows(t, store, `SELECT COUNT(*) FROM ledger_entries`); got != 1 {
		t.Fatalf("entries = %d, want 1", got)
	}
}

func TestApproveCaptureStatuses(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		wantEntry bool
	}{
		{name: "pending", status: constant.CaptureStatusPending, wantEntry: true},
		{name: "failed", status: constant.CaptureStatusFailed, wantEntry: true},
		{name: "extracting", status: constant.CaptureStatusExtracting, wantEntry: true},
		{name: "approved", status: constant.CaptureStatusApproved, wantEntry: false},
		{name: "rejected", status: constant.CaptureStatusRejected, wantEntry: false},
		{name: "duplicate", status: constant.CaptureStatusDuplicate, wantEntry: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newStore(t)
			asset, expense := baseline(t, store)
			capture := seedCapture(t, store, tc.status)
			entry := approvalEntry(t, asset, expense, "IDR")

			saved, err := store.Approve(t.Context(), capture, entry)
			if !tc.wantEntry {
				assertUnapproved(t, store, err)

				return
			}

			assertApproved(t, store, capture, saved, err)
		})
	}
}

func TestApproveCaptureRollsBackAfterInsert(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	capture := seedCapture(t, store, constant.CaptureStatusFailed)

	_, err := store.Approve(t.Context(), capture, approvalEntry(t, asset, expense, "NOT-A-CURRENCY"))
	if err == nil {
		t.Fatal("an invalid audit payload must fail the approval")
	}

	if got := countRows(t, store, `SELECT COUNT(*) FROM ledger_entries`); got != 0 {
		t.Fatalf("entries = %d, want 0 after rollback", got)
	}
	if got := countRows(t, store,
		`SELECT COUNT(*) FROM audit_log WHERE entity_kind = ?`, constant.AuditEntityEntry); got != 0 {
		t.Fatalf("entry audit rows = %d, want 0 after rollback", got)
	}

	stored, found, err := store.CaptureByRef(t.Context(), capture.Ref)
	if err != nil || !found {
		t.Fatalf("read capture: found=%v err=%v", found, err)
	}
	if stored.Status != constant.CaptureStatusFailed {
		t.Fatalf("status = %q, want failed", stored.Status)
	}
	if stored.ResolvedEntryID != nil {
		t.Fatalf("resolved_entry_id = %v, want nil", stored.ResolvedEntryID)
	}
}

func TestUpdateCaptureIfUnresolved(t *testing.T) {
	tests := []struct {
		name       string
		status     string
		wantStatus string
		wantErr    bool
	}{
		{name: "pending", status: constant.CaptureStatusPending, wantStatus: constant.CaptureStatusPending},
		{name: "failed", status: constant.CaptureStatusFailed, wantStatus: constant.CaptureStatusPending},
		{name: "extracting", status: constant.CaptureStatusExtracting, wantStatus: constant.CaptureStatusPending},
		{name: "approved", status: constant.CaptureStatusApproved, wantStatus: constant.CaptureStatusApproved, wantErr: true},
		{name: "rejected", status: constant.CaptureStatusRejected, wantStatus: constant.CaptureStatusRejected, wantErr: true},
		{name: "duplicate", status: constant.CaptureStatusDuplicate, wantStatus: constant.CaptureStatusDuplicate, wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newStore(t)
			capture := seedCapture(t, store, tc.status)
			capture.JobRef = "job-1"
			capture.Status = constant.CaptureStatusPending

			_, err := store.UpdateCaptureIfUnresolved(t.Context(), capture)
			if tc.wantErr {
				if !errors.Is(err, entity.ErrCaptureResolved) {
					t.Fatalf("err = %v, want capture_resolved", err)
				}
			} else if err != nil {
				t.Fatalf("update: %v", err)
			}

			stored, found, err := store.CaptureByRef(t.Context(), capture.Ref)
			if err != nil || !found {
				t.Fatalf("read capture: found=%v err=%v", found, err)
			}
			if stored.Status != tc.wantStatus {
				t.Fatalf("status = %q, want %q", stored.Status, tc.wantStatus)
			}
		})
	}
}

func TestCapturePayloadsFollowTheCapture(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	capture, insertErr := store.InsertCapture(ctx, entity.Capture{
		Kind:       constant.CaptureKindManual,
		Status:     constant.CaptureStatusPending,
		ClientID:   "client-1",
		DedupeKey:  uuid.New(),
		RawText:    "coffee 25k",
		DraftJSON:  `{"note":"coffee"}`,
		ReceivedAt: time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC),
	})
	if insertErr != nil {
		t.Fatalf("insert capture: %v", insertErr)
	}

	reads := []struct {
		name string
		read func() (entity.Capture, bool, error)
	}{
		{name: "by ref", read: func() (entity.Capture, bool, error) {
			return store.CaptureByRef(ctx, capture.Ref)
		}},
		{name: "by client id", read: func() (entity.Capture, bool, error) {
			return store.CaptureByClientID(ctx, capture.ClientID)
		}},
		{name: "by dedupe key", read: func() (entity.Capture, bool, error) {
			return store.CaptureByDedupeKey(ctx, capture.DedupeKey)
		}},
	}

	for _, read := range reads {
		t.Run(read.name, func(t *testing.T) {
			stored := requirePayloadCapture(t, read.read)
			assertCapturePayload(t, stored, "coffee 25k", `{"note":"coffee"}`)
		})
	}

	capture.DraftJSON = `{"note":"tea"}`
	capture.ExtractionError = "vendor timeout"
	if _, err := store.UpdateCapture(ctx, capture); err != nil {
		t.Fatalf("update capture: %v", err)
	}

	updated := requirePayloadCapture(t, func() (entity.Capture, bool, error) {
		return store.CaptureByRef(ctx, capture.Ref)
	})
	assertCapturePayload(t, updated, "coffee 25k", `{"note":"tea"}`)
	if updated.ExtractionError != "vendor timeout" {
		t.Fatalf("extraction_error = %q, want vendor timeout", updated.ExtractionError)
	}
	if got := countRows(t, store, `SELECT COUNT(*) FROM capture_payloads`); got != 1 {
		t.Fatalf("capture payload rows = %d, want 1", got)
	}
}

func requirePayloadCapture(t *testing.T, read func() (entity.Capture, bool, error)) entity.Capture {
	t.Helper()

	stored, found, err := read()
	if err != nil || !found {
		t.Fatalf("read capture: found=%v err=%v", found, err)
	}
	return stored
}

func assertCapturePayload(t *testing.T, stored entity.Capture, rawText, draftJSON string) {
	t.Helper()

	if stored.RawText != rawText || stored.DraftJSON != draftJSON {
		t.Fatalf("payload = %q / %q, want %q / %q", stored.RawText, stored.DraftJSON, rawText, draftJSON)
	}
}

func TestInsertCaptureMapsUniquenessToDuplicate(t *testing.T) {
	tests := []struct {
		name     string
		conflict func(*entity.Capture)
	}{
		{name: "client id", conflict: func(*entity.Capture) {}},
		{name: "dedupe key", conflict: func(second *entity.Capture) {
			second.ClientID = "client-2"
		}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newStore(t)
			ctx := t.Context()

			first := entity.Capture{
				Kind:       constant.CaptureKindManual,
				Status:     constant.CaptureStatusPending,
				ClientID:   "client-1",
				DedupeKey:  uuid.New(),
				ReceivedAt: time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC),
			}
			if _, err := store.InsertCapture(ctx, first); err != nil {
				t.Fatalf("first insert: %v", err)
			}

			second := first
			second.Ref = ""
			tc.conflict(&second)
			if _, err := store.InsertCapture(ctx, second); !errors.Is(err, entity.ErrDuplicate) {
				t.Fatalf("error = %v, want duplicate", err)
			}

			if got := countRows(t, store, `SELECT COUNT(*) FROM captures`); got != 1 {
				t.Fatalf("captures = %d, want 1", got)
			}
			if got := countRows(t, store, `SELECT COUNT(*) FROM capture_payloads`); got != 1 {
				t.Fatalf("capture payloads = %d, want 1", got)
			}
		})
	}
}
