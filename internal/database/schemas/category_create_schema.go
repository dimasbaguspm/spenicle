package schemas

// CreateCategorySchema represents the schema for creating a new category
type CreateCategorySchema struct {
	Name string `json:"name" validate:"required" doc:"Name of the category" example:"Food" minLength:"1" maxLength:"255"`
	Type string `json:"type" validate:"required,oneof=expense income transfer" doc:"Type of category" enum:"expense,income,transfer" example:"expense"`
	Note string `json:"note" validate:"omitempty" doc:"Optional note for the category" example:"Groceries and dining" maxLength:"1000"`
}
