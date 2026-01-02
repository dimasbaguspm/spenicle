package schemas

// UpdateCategorySchema represents the schema for updating a category.
// All fields are optional pointers to distinguish between not provided and explicit zero values.
type UpdateCategorySchema struct {
	Name *string `json:"name,omitempty" doc:"Name of the category" example:"Food" minLength:"1" maxLength:"255"`
	Type *string `json:"type,omitempty" enum:"expense,income,transfer" doc:"Type of category" example:"expense"`
	Note *string `json:"note,omitempty" doc:"Note for the category" example:"Updated note" maxLength:"1000"`
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
	return false
}
