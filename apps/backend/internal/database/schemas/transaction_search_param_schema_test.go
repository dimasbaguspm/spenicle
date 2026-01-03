package schemas

import "testing"

func TestSearchParamTransactionSchema(t *testing.T) {
	schema := SearchParamTransactionSchema{
		Type:           []string{"expense"},
		AccountIDs:     []int{1},
		CategoryIDs:    []int{1},
		Page:           1,
		Limit:          10,
		OrderBy:        "date",
		OrderDirection: "desc",
	}

	if len(schema.Type) == 0 || schema.Type[0] != "expense" {
		t.Errorf("expected Type to be ['expense'], got %v", schema.Type)
	}

	if len(schema.AccountIDs) == 0 || schema.AccountIDs[0] != 1 {
		t.Errorf("expected AccountIDs to be [1], got %v", schema.AccountIDs)
	}

	if len(schema.CategoryIDs) == 0 || schema.CategoryIDs[0] != 1 {
		t.Errorf("expected CategoryIDs to be [1], got %v", schema.CategoryIDs)
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

	if len(schema.Type) != 0 {
		t.Errorf("expected Type to be empty, got %v", schema.Type)
	}

	if len(schema.AccountIDs) != 0 {
		t.Errorf("expected AccountIDs to be empty, got %v", schema.AccountIDs)
	}

	if len(schema.CategoryIDs) != 0 {
		t.Errorf("expected CategoryIDs to be empty, got %v", schema.CategoryIDs)
	}
}
