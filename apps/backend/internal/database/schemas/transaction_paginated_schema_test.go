package schemas

import "testing"

func TestPaginatedTransactionSchema(t *testing.T) {
	schema := PaginatedTransactionSchema{
		Items:      []TransactionSchema{},
		PageNumber: 1,
		PageSize:   10,
		TotalCount: 100,
		PageTotal:  10,
	}

	if schema.PageNumber != 1 {
		t.Errorf("expected PageNumber to be 1, got %d", schema.PageNumber)
	}

	if schema.PageSize != 10 {
		t.Errorf("expected PageSize to be 10, got %d", schema.PageSize)
	}

	if schema.TotalCount != 100 {
		t.Errorf("expected TotalCount to be 100, got %d", schema.TotalCount)
	}

	if schema.PageTotal != 10 {
		t.Errorf("expected PageTotal to be 10, got %d", schema.PageTotal)
	}

	if len(schema.Items) != 0 {
		t.Errorf("expected Items to be empty, got %d items", len(schema.Items))
	}
}
