package schemas

import "testing"

func TestSearchParamTransactionSchema(t *testing.T) {
	schema := SearchParamTransactionSchema{
		Type:           "expense",
		AccountID:      1,
		CategoryID:     1,
		Page:           1,
		Limit:          10,
		OrderBy:        "date",
		OrderDirection: "desc",
	}

	if schema.Type != "expense" {
		t.Errorf("expected Type to be 'expense', got %v", schema.Type)
	}

	if schema.AccountID != 1 {
		t.Errorf("expected AccountID to be 1, got %v", schema.AccountID)
	}

	if schema.CategoryID != 1 {
		t.Errorf("expected CategoryID to be 1, got %v", schema.CategoryID)
	}

	if schema.Page != 1 {
		t.Errorf("expected Page to be 1, got %d", schema.Page)
	}

	if schema.Limit != 10 {
		t.Errorf("expected Limit to be 10, got %d", schema.Limit)
	}

	if schema.OrderBy != "date" {
		t.Errorf("expected OrderBy to be 'date', got %s", schema.OrderBy)
	}

	if schema.OrderDirection != "desc" {
		t.Errorf("expected OrderDirection to be 'desc', got %s", schema.OrderDirection)
	}
}

func TestSearchParamTransactionSchema_OptionalFilters(t *testing.T) {
	schema := SearchParamTransactionSchema{
		Page:           1,
		Limit:          10,
		OrderBy:        "created_at",
		OrderDirection: "asc",
	}

	if schema.Type != "" {
		t.Errorf("expected Type to be empty, got %s", schema.Type)
	}

	if schema.AccountID != 0 {
		t.Errorf("expected AccountID to be 0, got %d", schema.AccountID)
	}

	if schema.CategoryID != 0 {
		t.Errorf("expected CategoryID to be 0, got %d", schema.CategoryID)
	}
}
