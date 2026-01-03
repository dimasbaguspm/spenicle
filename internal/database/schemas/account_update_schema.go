package schemas

// UpdateAccountSchema represents the schema for updating an account.
// All fields are optional pointers to distinguish between not provided and explicit zero values.
type UpdateAccountSchema struct {
	Name       *string `json:"name,omitempty" doc:"Name of the account" example:"Salary" minLength:"1" maxLength:"255"`
	Type       *string `json:"type,omitempty" enum:"expense,income" doc:"Type of account" example:"income"`
	Note       *string `json:"note,omitempty" doc:"Note for the account" example:"Updated note" maxLength:"1000"`
	Amount     *int64  `json:"amount,omitempty" minimum:"0" doc:"Account amount" example:"5000"`
	Icon       *string `json:"icon,omitempty" doc:"Icon identifier set by frontend" example:"wallet-icon" maxLength:"255"`
	IconColor  *string `json:"iconColor,omitempty" doc:"Icon color in hex format" example:"#4CAF50" maxLength:"7"`
	ArchivedAt *string `json:"archivedAt,omitempty" doc:"Archive timestamp in ISO 8601 format, set to null to unarchive" example:"2026-01-03T00:00:00Z" format:"date-time"`
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
	if uas.Icon != nil {
		if payload.Icon == nil || *payload.Icon != *uas.Icon {
			return true
		}
	}
	if uas.IconColor != nil {
		if payload.IconColor == nil || *payload.IconColor != *uas.IconColor {
			return true
		}
	}
	if uas.ArchivedAt != nil {
		return true
	}
	return false
}
