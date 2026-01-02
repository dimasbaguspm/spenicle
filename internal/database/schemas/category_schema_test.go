package schemas

import (
	"encoding/json"
	"testing"
	"time"
)

func TestCategorySchema_ToJSON(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	cs := CategorySchema{
		ID:        1,
		Name:      "Food",
		Type:      "expense",
		Note:      "test",
		CreatedAt: now,
	}
	if _, err := json.Marshal(cs); err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
}

func TestCategorySchema_FromJSON(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	cs := CategorySchema{
		ID:        1,
		Name:      "Food",
		Type:      "expense",
		Note:      "test",
		CreatedAt: now,
	}
	b, err := json.Marshal(cs)
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
	var cs2 CategorySchema
	if err := json.Unmarshal(b, &cs2); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if cs2.ID != cs.ID || cs2.Name != cs.Name || cs2.Type != cs.Type {
		t.Fatalf("roundtrip values differ: got %+v want %+v", cs2, cs)
	}
	if !cs2.CreatedAt.Equal(cs.CreatedAt) {
		t.Fatalf("createdAt mismatch: got %v want %v", cs2.CreatedAt, cs.CreatedAt)
	}
}
