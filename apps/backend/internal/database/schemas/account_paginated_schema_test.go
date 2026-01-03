package schemas

import (
	"encoding/json"
	"testing"
	"time"
)

func TestPaginatedAccountSchema_ToJSON(t *testing.T) {
	pas := PaginatedAccountSchema{
		PageTotal:  2,
		PageNumber: 1,
		PageSize:   10,
		TotalCount: 15,
		Items: []AccountSchema{
			{ID: 1, Name: "A", Type: "expense", Amount: 10, CreatedAt: time.Now().UTC()},
		},
	}
	if _, err := json.Marshal(pas); err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
}

func TestPaginatedAccountSchema_JSONContainsFields(t *testing.T) {
	pas := PaginatedAccountSchema{
		PageTotal:  2,
		PageNumber: 1,
		PageSize:   10,
		TotalCount: 15,
		Items: []AccountSchema{
			{ID: 1, Name: "A", Type: "expense", Amount: 10, CreatedAt: time.Now().UTC()},
		},
	}
	b, err := json.Marshal(pas)
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
