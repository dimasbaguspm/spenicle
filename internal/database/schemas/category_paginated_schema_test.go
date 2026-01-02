package schemas

import (
	"encoding/json"
	"testing"
	"time"
)

func TestPaginatedCategorySchema_ToJSON(t *testing.T) {
	pcs := PaginatedCategorySchema{
		PageTotal:  2,
		PageNumber: 1,
		PageSize:   10,
		TotalCount: 15,
		Items: []CategorySchema{
			{ID: 1, Name: "Food", Type: "expense", CreatedAt: time.Now().UTC()},
		},
	}
	if _, err := json.Marshal(pcs); err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
}

func TestPaginatedCategorySchema_JSONContainsFields(t *testing.T) {
	pcs := PaginatedCategorySchema{
		PageTotal:  2,
		PageNumber: 1,
		PageSize:   10,
		TotalCount: 15,
		Items: []CategorySchema{
			{ID: 1, Name: "Food", Type: "expense", CreatedAt: time.Now().UTC()},
		},
	}
	b, err := json.Marshal(pcs)
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
	// ensure JSON contains expected keys by unmarshaling to map
	var m map[string]json.RawMessage
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("unmarshal paginated json failed: %v", err)
	}
	if _, ok := m["pageTotal"]; !ok {
		t.Fatalf("pageTotal missing in JSON")
	}
	if _, ok := m["items"]; !ok {
		t.Fatalf("items missing in JSON")
	}
}
