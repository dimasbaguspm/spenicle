package schemas

import (
	"encoding/json"
	"testing"
)

func TestCreateCategorySchema_ToJSON(t *testing.T) {
	ccs := CreateCategorySchema{
		Name: "Food",
		Type: "expense",
		Note: "test note",
	}
	if _, err := json.Marshal(ccs); err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
}

func TestCreateCategorySchema_FromJSON(t *testing.T) {
	ccs := CreateCategorySchema{
		Name: "Food",
		Type: "expense",
		Note: "test note",
	}
	b, err := json.Marshal(ccs)
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
	var ccs2 CreateCategorySchema
	if err := json.Unmarshal(b, &ccs2); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if ccs2.Name != ccs.Name || ccs2.Type != ccs.Type || ccs2.Note != ccs.Note {
		t.Fatalf("roundtrip values differ: got %+v want %+v", ccs2, ccs)
	}
}
