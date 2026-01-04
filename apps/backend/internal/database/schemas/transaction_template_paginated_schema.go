package schemas

// PaginatedTransactionTemplateSchema represents a paginated list of transaction templates
type PaginatedTransactionTemplateSchema struct {
	PageTotal  int                         `json:"pageTotal" doc:"Total number of pages" example:"5"`
	PageNumber int                         `json:"pageNumber" doc:"Current page number" example:"1"`
	PageSize   int                         `json:"pageSize" doc:"Number of items per page" example:"10"`
	TotalCount int                         `json:"totalCount" doc:"Total number of items" example:"50"`
	Items      []TransactionTemplateSchema `json:"items" doc:"List of transaction templates in current page"`
}
