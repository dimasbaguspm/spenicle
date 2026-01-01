package schema

import (
	"encoding/json"
	"testing"
)

func TestUpdateAccountSchema_FromJSON_ValidChange(t *testing.T) {
	jsonStr := []byte(`{"name":"New","amount":10}`)
	u := UpdateAccountSchema{}

	if err := json.Unmarshal(jsonStr, &u); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}

}

func TestUpdateAccountSchema_InvalidEmptyName(t *testing.T) {
	bad := []byte(`{"name":""}`)
	var ub UpdateAccountSchema
	if err := json.Unmarshal(bad, &ub); err != nil {
		t.Fatalf("FromJSON failed: %v", err)
	}

}
