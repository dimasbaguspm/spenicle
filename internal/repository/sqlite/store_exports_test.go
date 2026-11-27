package sqlite_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestExportWindowRoundTrip(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	tests := []struct {
		name     string
		clientID string
		from     *time.Time
		to       *time.Time
	}{
		{name: "no window", clientID: "export-none"},
		{
			name:     "a whole year",
			clientID: "export-2025",
			from:     exportDay(2025, time.January, 1),
			to:       exportDay(2025, time.December, 31),
		},
		{
			name:     "one single day",
			clientID: "export-day",
			from:     exportDay(2025, time.March, 4),
			to:       exportDay(2025, time.March, 4),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			queued, err := store.InsertExport(ctx, entity.Export{
				ClientID:      test.clientID,
				Status:        constant.ExportStatusQueued,
				Format:        constant.ExportFormatJSON,
				SchemaVersion: 4,
				CreatedAt:     time.Date(2026, time.February, 14, 9, 0, 0, 0, time.UTC),
				FromOn:        test.from,
				ToOn:          test.to,
			})
			if err != nil {
				t.Fatalf("insert export: %v", err)
			}

			byRef, found, err := store.ExportByRef(ctx, queued.Ref)
			if err != nil {
				t.Fatalf("export by ref: %v", err)
			}

			if !found {
				t.Fatal("the job is not found by ref")
			}

			assertExportWindow(t, "by ref", byRef, test.from, test.to)

			byClientID, found, err := store.ExportByClientID(ctx, test.clientID)
			if err != nil {
				t.Fatalf("export by client id: %v", err)
			}

			if !found {
				t.Fatal("the job is not found by client id")
			}

			assertExportWindow(t, "by client id", byClientID, test.from, test.to)
		})
	}
}

func TestExportClientIDKeepsOneWindow(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	original := entity.Export{
		ClientID:      "export-1",
		Status:        constant.ExportStatusQueued,
		Format:        constant.ExportFormatJSON,
		SchemaVersion: 4,
		CreatedAt:     time.Date(2026, time.February, 14, 9, 0, 0, 0, time.UTC),
		FromOn:        exportDay(2025, time.January, 1),
		ToOn:          exportDay(2025, time.December, 31),
	}

	if _, err := store.InsertExport(ctx, original); err != nil {
		t.Fatalf("insert export: %v", err)
	}

	other := original
	other.FromOn = exportDay(2024, time.January, 1)
	other.ToOn = exportDay(2024, time.December, 31)

	if _, err := store.InsertExport(ctx, other); err == nil {
		t.Fatal("a second row for the same client id was accepted")
	}

	stored, found, err := store.ExportByClientID(ctx, original.ClientID)
	if err != nil {
		t.Fatalf("export by client id: %v", err)
	}

	if !found {
		t.Fatal("the job is not found by client id")
	}

	assertExportWindow(t, "the surviving row", stored, original.FromOn, original.ToOn)
}

func TestQueuedExportsCarryTheirWindow(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	if _, err := store.InsertExport(ctx, entity.Export{
		ClientID:      "export-1",
		Status:        constant.ExportStatusQueued,
		Format:        constant.ExportFormatCSV,
		SchemaVersion: 4,
		CreatedAt:     time.Date(2026, time.February, 14, 9, 0, 0, 0, time.UTC),
		FromOn:        exportDay(2025, time.January, 1),
		ToOn:          exportDay(2025, time.December, 31),
	}); err != nil {
		t.Fatalf("insert export: %v", err)
	}

	queued, err := store.QueuedExports(ctx, 10)
	if err != nil {
		t.Fatalf("queued exports: %v", err)
	}

	if len(queued) != 1 {
		t.Fatalf("the queue holds %d jobs, want 1", len(queued))
	}

	assertExportWindow(t, "the queued job", queued[0],
		exportDay(2025, time.January, 1), exportDay(2025, time.December, 31))
}

func assertExportWindow(t *testing.T, from string, job entity.Export, wantFrom, wantTo *time.Time) {
	t.Helper()

	if (wantFrom == nil) != (job.FromOn == nil) || (wantTo == nil) != (job.ToOn == nil) {
		t.Fatalf("the window read back %s is %v..%v, want %v..%v",
			from, job.FromOn, job.ToOn, wantFrom, wantTo)
	}

	if wantFrom == nil {
		return
	}

	if !job.FromOn.Equal(*wantFrom) || !job.ToOn.Equal(*wantTo) {
		t.Fatalf("the window read back %s is %s..%s, want %s..%s",
			from,
			job.FromOn.Format(constant.DateLayout), job.ToOn.Format(constant.DateLayout),
			wantFrom.Format(constant.DateLayout), wantTo.Format(constant.DateLayout))
	}
}

func exportDay(year int, month time.Month, day int) *time.Time {
	at := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)

	return &at
}

func TestInsertExportWithEventWritesTheFirstTrail(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()
	at := time.Date(2026, time.February, 14, 9, 0, 0, 0, time.UTC)

	queued, err := store.InsertExportWithEvent(ctx, entity.Export{
		ClientID:      "export-queued-event",
		Status:        constant.ExportStatusQueued,
		Format:        constant.ExportFormatJSON,
		SchemaVersion: 4,
		CreatedAt:     at,
	}, entity.ExportEvent{
		Kind:  constant.ExportEventQueued,
		Actor: constant.ExportActorUser,
		At:    at,
	})
	if err != nil {
		t.Fatalf("insert export with event: %v", err)
	}

	events, err := store.ListExportEvents(ctx, entity.ExportEventFilter{
		ExportRef: queued.Ref, Limit: 10,
	})
	if err != nil {
		t.Fatalf("list events: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("events = %d, want 1", len(events))
	}

	if events[0].Kind != constant.ExportEventQueued || events[0].Actor != constant.ExportActorUser {
		t.Fatalf("event = %+v", events[0])
	}
}
