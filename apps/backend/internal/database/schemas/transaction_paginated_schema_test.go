package schemas

import "testing"

func TestPaginatedTransactionSchema(t *testing.T) {
	schema := PaginatedTransactionSchema{
		Data:       []TransactionSchema{},
		Page:       1,
		Limit:      10,
		TotalItems: 100,
		TotalPages: 10,
	}

	if schema.Page != 1 {
		t.Errorf("expected Page to be 1, got %d", schema.Page)
	}

	if schema.Limit != 10 {
		t.Errorf("expected Limit to be 10, got %d", schema.Limit)
	}

	if schema.TotalItems != 100 {
		t.Errorf("expected TotalItems to be 100, got %d", schema.TotalItems)
	}

	if schema.TotalPages != 10 {
		t.Errorf("expected TotalPages to be 10, got %d", schema.TotalPages)
	}

	if len(schema.Data) != 0 {
		t.Errorf("expected Data to be empty, got %d items", len(schema.Data))
	}
}
