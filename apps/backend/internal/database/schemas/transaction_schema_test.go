package schemas

import (
	"testing"
	"time"
)

func TestTransactionSchema(t *testing.T) {
	now := time.Now()
	note := "test note"

	transaction := TransactionSchema{
		ID:         1,
		Type:       "expense",
		Date:       now,
		Amount:     50000,
		AccountID:  1,
		CategoryID: 1,
		Note:       &note,
		CreatedAt:  now,
		UpdatedAt:  now,
		DeletedAt:  nil,
	}

	if transaction.ID != 1 {
		t.Errorf("expected ID to be 1, got %d", transaction.ID)
	}

	if transaction.Type != "expense" {
		t.Errorf("expected Type to be 'expense', got %s", transaction.Type)
	}

	if transaction.Amount != 50000 {
		t.Errorf("expected Amount to be 50000, got %d", transaction.Amount)
	}

	if transaction.AccountID != 1 {
		t.Errorf("expected AccountID to be 1, got %d", transaction.AccountID)
	}

	if transaction.CategoryID != 1 {
		t.Errorf("expected CategoryID to be 1, got %d", transaction.CategoryID)
	}

	if transaction.Note == nil || *transaction.Note != "test note" {
		t.Errorf("expected Note to be 'test note', got %v", transaction.Note)
	}
}
