package schemas

// AccountReorderItemSchema represents a single account order item
type AccountReorderItemSchema struct {
	ID           int64 `json:"id" doc:"Account ID" example:"1"`
	DisplayOrder int   `json:"displayOrder" doc:"New display order" example:"1"`
}

// AccountReorderSchema represents the schema for batch updating account display order
type AccountReorderSchema struct {
	Items []AccountReorderItemSchema `json:"items" validate:"required,min=1" doc:"Array of account ID and display order pairs" minItems:"1"`
}
