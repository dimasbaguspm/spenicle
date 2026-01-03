package schemas

// CategoryReorderItemSchema represents a single category order item
type CategoryReorderItemSchema struct {
	ID           int64 `json:"id" doc:"Category ID" example:"1"`
	DisplayOrder int   `json:"displayOrder" doc:"New display order" example:"1"`
}

// CategoryReorderSchema represents the schema for batch updating category display order
type CategoryReorderSchema struct {
	Items []CategoryReorderItemSchema `json:"items" validate:"required,min=1" doc:"Array of category ID and display order pairs" minItems:"1"`
}
