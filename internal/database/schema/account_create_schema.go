package schema

import "encoding/json"

// CreateAccountSchema represents the schema for creating a new account
type CreateAccountSchema struct {
	Name   string `json:"name" validate:"required"`
	Type   string `json:"type" validate:"required,oneof=expense income"`
	Note   string `json:"note" validate:"omitempty"`
	Amount int64  `json:"amount" validate:"gte=0"`
}

// FromJSON populates CreateAccountSchema from a JSON-compatible map
func (cas *CreateAccountSchema) FromJSON(data []byte) error {
	return json.Unmarshal(data, cas)
}

func (cas *CreateAccountSchema) IsValid() bool {
	if cas.Name == "" {
		return false
	}
	if cas.Type != "expense" && cas.Type != "income" {
		return false
	}
	if cas.Amount < 0 {
		return false
	}
	return true
}
