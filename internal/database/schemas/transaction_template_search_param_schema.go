package schemas

// SearchParamTransactionTemplateSchema defines query parameters for searching transaction templates
type SearchParamTransactionTemplateSchema struct {
	ID         []int64  `query:"id" doc:"Filter by transaction template IDs"`
	AccountID  []int64  `query:"accountId" doc:"Filter by account IDs"`
	CategoryID []int64  `query:"categoryId" doc:"Filter by category IDs"`
	Type       []string `query:"type" doc:"Filter by transaction type"`
	Recurrence []string `query:"recurrence" doc:"Filter by recurrence pattern"`
	Page       int      `query:"page" default:"1" minimum:"1" doc:"Page number" example:"1"`
	Limit      int      `query:"limit" default:"10" minimum:"1" maximum:"100" doc:"Items per page" example:"10"`
}
