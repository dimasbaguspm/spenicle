package schema

import (
	"encoding/json"
)

// UpdateAccountSchema represents the schema for updating an account
type UpdateAccountSchema struct {
	Name   *string `json:"name"`
	Type   *string `json:"type" validate:"omitempty,oneof=expense income"`
	Note   *string `json:"note"`
	Amount *int64  `json:"amount" validate:"omitempty,gte=0"`
}

func (uas *UpdateAccountSchema) FromJSON(data []byte) error {
	return json.Unmarshal(data, uas)
}

func (uas *UpdateAccountSchema) IsValid() bool {
	if uas.Name != nil && *uas.Name == "" {
		return false
	}
	if uas.Type != nil && *uas.Type != "expense" && *uas.Type != "income" {
		return false
	}
	if uas.Amount != nil && *uas.Amount < 0 {
		return false
	}
	return true
}

func (uas *UpdateAccountSchema) IsChanged(updateData UpdateAccountSchema) bool {
	if updateData.Name != nil {
		return true
	}
	if updateData.Type != nil {
		return true
	}
	if updateData.Note != nil {
		return true
	}
	if updateData.Amount != nil {
		return true
	}
	return false
}
