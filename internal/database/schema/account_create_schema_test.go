package schema

import (
	"testing"
)

func TestCreateAccountSchema_FromJSON_Valid(t *testing.T) {
	validJSON := []byte(`{"name":"Cash","type":"expense","note":"","amount":100}`)
	var cas CreateAccountSchema
	if err := cas.FromJSON(validJSON); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if !cas.IsValid() {
		t.Fatalf("expected valid schema, got invalid: %+v", cas)
	}
}

func TestCreateAccountSchema_MissingName(t *testing.T) {
	invalidJSON := []byte(`{"type":"income","amount":0}`)
	var cas CreateAccountSchema
	if err := cas.FromJSON(invalidJSON); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if cas.IsValid() {
		t.Fatalf("expected invalid schema due to missing name")
	}
}

func TestCreateAccountSchema_InvalidType(t *testing.T) {
	invalidType := []byte(`{"name":"X","type":"invalid","amount":0}`)
	var cas CreateAccountSchema
	if err := cas.FromJSON(invalidType); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if cas.IsValid() {
		t.Fatalf("expected invalid schema due to invalid type")
	}
}

func TestCreateAccountSchema_NegativeAmount(t *testing.T) {
	negAmt := []byte(`{"name":"X","type":"income","amount":-5}`)
	var cas CreateAccountSchema
	if err := cas.FromJSON(negAmt); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
	if cas.IsValid() {
		t.Fatalf("expected invalid schema due to negative amount")
	}
}
