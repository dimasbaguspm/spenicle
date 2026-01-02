package schemas

import (
	"testing"
	"time"
)

func TestUpdateTransactionSchema(t *testing.T) {
	now := time.Now()
	transactionType := "income"
	amount := 75000
	accountID := 2
	categoryID := 2
	note := "updated note"

	schema := UpdateTransactionSchema{
		Type:       &transactionType,
		Date:       &now,
		Amount:     &amount,
		AccountID:  &accountID,
		CategoryID: &categoryID,
		Note:       &note,
	}

	if schema.Type == nil || *schema.Type != "income" {
		t.Errorf("expected Type to be 'income', got %v", schema.Type)
	}

	if schema.Date == nil || !schema.Date.Equal(now) {
		t.Errorf("expected Date to be %v, got %v", now, schema.Date)
	}

	if schema.Amount == nil || *schema.Amount != 75000 {
		t.Errorf("expected Amount to be 75000, got %v", schema.Amount)
	}

	if schema.AccountID == nil || *schema.AccountID != 2 {
		t.Errorf("expected AccountID to be 2, got %v", schema.AccountID)
	}

	if schema.CategoryID == nil || *schema.CategoryID != 2 {
		t.Errorf("expected CategoryID to be 2, got %v", schema.CategoryID)
	}

	if schema.Note == nil || *schema.Note != "updated note" {
		t.Errorf("expected Note to be 'updated note', got %v", schema.Note)
	}
}

func TestUpdateTransactionSchemaHasChanges(t *testing.T) {
	t.Run("returns true when at least one field is set", func(t *testing.T) {
		transactionType := "expense"
		schema := UpdateTransactionSchema{Type: &transactionType}
		if !schema.HasChanges() {
			t.Error("expected HasChanges to return true")
		}
	})

	t.Run("returns false when no fields are set", func(t *testing.T) {
		schema := UpdateTransactionSchema{}
		if schema.HasChanges() {
			t.Error("expected HasChanges to return false")
		}
	})
}
