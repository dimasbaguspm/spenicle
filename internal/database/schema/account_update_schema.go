package schema

// UpdateAccountSchema represents the schema for updating an account.
// All fields are optional pointers to distinguish between not provided and explicit zero values.
type UpdateAccountSchema struct {
	Name   *string `json:"name,omitempty" doc:"Name of the account" example:"Salary" minLength:"1" maxLength:"255"`
	Type   *string `json:"type,omitempty" enum:"expense,income" doc:"Type of account" example:"income"`
	Note   *string `json:"note,omitempty" doc:"Note for the account" example:"Updated note" maxLength:"1000"`
	Amount *int64  `json:"amount,omitempty" minimum:"0" doc:"Account amount" example:"5000"`
}

func (uas *UpdateAccountSchema) HasChanges(payload AccountSchema) bool {
	if uas.Name != nil && payload.Name != *uas.Name {
		return true
	}
	if uas.Type != nil && payload.Type != *uas.Type {
		return true
	}
	if uas.Note != nil && payload.Note != *uas.Note {
		return true
	}
	if uas.Amount != nil && payload.Amount != *uas.Amount {
		return true
	}
	return false
}
