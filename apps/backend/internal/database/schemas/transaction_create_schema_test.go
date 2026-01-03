package schemas

import (
	"testing"
	"time"
)

func TestCreateTransactionSchema(t *testing.T) {
	now := time.Now()
	note := "test note"

	schema := CreateTransactionSchema{
		Type:       "expense",
		Date:       &now,
		Amount:     50000,
		AccountID:  1,
		CategoryID: 1,
		Note:       &note,
	}

	if schema.Type != "expense" {
		t.Errorf("expected Type to be 'expense', got %s", schema.Type)
	}

	if schema.Amount != 50000 {
		t.Errorf("expected Amount to be 50000, got %d", schema.Amount)
	}

	if schema.AccountID != 1 {
		t.Errorf("expected AccountID to be 1, got %d", schema.AccountID)
	}

	if schema.CategoryID != 1 {
		t.Errorf("expected CategoryID to be 1, got %d", schema.CategoryID)
	}

	if schema.Date == nil || !schema.Date.Equal(now) {
		t.Errorf("expected Date to be %v, got %v", now, schema.Date)
	}

	if schema.Note == nil || *schema.Note != "test note" {
		t.Errorf("expected Note to be 'test note', got %v", schema.Note)
	}
}
