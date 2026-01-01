package schema

import (
	"encoding/json"
	"testing"
)

func TestCreateAccountSchema_MissingName(t *testing.T) {
	invalidJSON := []byte(`{"type":"income","amount":0}`)
	var cas CreateAccountSchema
	if err := json.Unmarshal(invalidJSON, &cas); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}
}

func TestCreateAccountSchema_InvalidType(t *testing.T) {
	invalidType := []byte(`{"name":"X","type":"invalid","amount":0}`)
	var cas CreateAccountSchema
	if err := json.Unmarshal(invalidType, &cas); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}

}

func TestCreateAccountSchema_NegativeAmount(t *testing.T) {
	negAmt := []byte(`{"name":"X","type":"income","amount":-5}`)
	var cas CreateAccountSchema
	if err := json.Unmarshal(negAmt, &cas); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}

}
