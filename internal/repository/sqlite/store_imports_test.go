package sqlite_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestInsertImportBatchChunksRowsAndKeepsEditableIDs(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()
	now := time.Date(2026, 2, 14, 10, 0, 0, 0, time.UTC)

	rows := make([]entity.ImportRow, 401)
	for index := range rows {
		rows[index] = entity.ImportRow{
			RowIndex:    index,
			OccurredOn:  now.AddDate(0, 0, -(index % 28)),
			AmountMinor: int64(index+1) * 100,
			Currency:    "IDR",
			Description: fmt.Sprintf("row %d", index),
			AccountRef:  "cash-ref",
			Status:      constant.ImportRowStatusPending,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}

	batch, err := store.InsertImportBatch(ctx, entity.ImportBatch{
		ClientID:  "chunked-client",
		FileHash:  "chunked-hash",
		Filename:  "statement.csv",
		Status:    constant.ImportStatusDraft,
		RowsTotal: len(rows),
		Currency:  "IDR",
		CreatedAt: now,
		ExpiresAt: now.Add(time.Hour),
		Rows:      rows,
	})
	if err != nil {
		t.Fatalf("insert batch: %v", err)
	}

	if batch.Rows[0].ID == 0 {
		t.Fatal("the first row has no id")
	}
	if want := batch.Rows[0].ID + 200; batch.Rows[200].ID != want {
		t.Fatalf("row 200 id = %d, want %d", batch.Rows[200].ID, want)
	}
	if want := batch.Rows[0].ID + 400; batch.Rows[400].ID != want {
		t.Fatalf("row 400 id = %d, want %d", batch.Rows[400].ID, want)
	}

	loaded, err := store.ImportRows(ctx, batch.ID)
	if err != nil {
		t.Fatalf("load rows: %v", err)
	}
	if len(loaded) != 401 {
		t.Fatalf("loaded %d rows, want 401", len(loaded))
	}
	if loaded[400].Ref != batch.Rows[400].Ref {
		t.Fatalf("row 400 ref = %q, want %q", loaded[400].Ref, batch.Rows[400].Ref)
	}

	target := loaded[400]
	target.Description = "edited row"
	if _, err := store.EditImportRow(ctx, target, now.Add(2*time.Hour), nil); err != nil {
		t.Fatalf("edit last row: %v", err)
	}
}
