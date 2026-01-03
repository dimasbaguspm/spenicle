package schemas

// UpdateCategorySchema represents the schema for updating a category.
// All fields are optional pointers to distinguish between not provided and explicit zero values.
type UpdateCategorySchema struct {
	Name       *string `json:"name,omitempty" doc:"Name of the category" example:"Food" minLength:"1" maxLength:"255"`
	Type       *string `json:"type,omitempty" enum:"expense,income,transfer" doc:"Type of category" example:"expense"`
	Note       *string `json:"note,omitempty" doc:"Note for the category" example:"Updated note" maxLength:"1000"`
	Icon       *string `json:"icon,omitempty" doc:"Icon identifier set by frontend" example:"food-icon" maxLength:"255"`
	IconColor  *string `json:"iconColor,omitempty" doc:"Icon color in hex format" example:"#FF5733" maxLength:"7"`
	ArchivedAt *string `json:"archivedAt,omitempty" doc:"Archive timestamp in ISO 8601 format, set to null to unarchive" example:"2026-01-03T00:00:00Z" format:"date-time"`
}

func (ucs *UpdateCategorySchema) HasChanges(payload CategorySchema) bool {
	if ucs.Name != nil && payload.Name != *ucs.Name {
		return true
	}
	if ucs.Type != nil && payload.Type != *ucs.Type {
		return true
	}
	if ucs.Note != nil && payload.Note != *ucs.Note {
		return true
	}
	if ucs.Icon != nil {
		if payload.Icon == nil || *payload.Icon != *ucs.Icon {
			return true
		}
	}
	if ucs.IconColor != nil {
		if payload.IconColor == nil || *payload.IconColor != *ucs.IconColor {
			return true
		}
	}
	if ucs.ArchivedAt != nil {
		return true
	}
	return false
}
