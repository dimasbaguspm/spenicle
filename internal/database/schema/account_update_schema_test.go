package schema

import (
	"testing"
)

func TestUpdateAccountSchema_FromJSON_ValidChange(t *testing.T) {
	jsonStr := []byte(`{"name":"New","amount":10}`)
	u := UpdateAccountSchema{}

	if err := u.FromJSON(jsonStr); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if !u.IsValid() {
		t.Fatalf("expected valid update schema")
	}
	if !u.IsChanged(u) {
		t.Fatalf("expected IsChanged to be true")
	}
}

func TestUpdateAccountSchema_InvalidEmptyName(t *testing.T) {
	bad := []byte(`{"name":""}`)
	var ub UpdateAccountSchema
	if err := ub.FromJSON(bad); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if ub.IsValid() {
		t.Fatalf("expected invalid update schema due to empty name")
	}
}
