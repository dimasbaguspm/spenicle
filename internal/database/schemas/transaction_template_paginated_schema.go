package schemas

// PaginatedTransactionTemplateSchema represents a paginated list of transaction templates
type PaginatedTransactionTemplateSchema struct {
	Items      []TransactionTemplateSchema `json:"items" doc:"List of transaction templates"`
	TotalCount int                         `json:"totalCount" doc:"Total number of items" example:"100"`
	Page       int                         `json:"page" doc:"Current page number" example:"1"`
	Limit      int                         `json:"limit" doc:"Items per page" example:"10"`
}
