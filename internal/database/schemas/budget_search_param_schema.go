package schemas

// SearchParamBudgetSchema represents search/filter parameters for budgets
type SearchParamBudgetSchema struct {
	ID         []int  `json:"id,omitempty" doc:"Filter by budget IDs" example:"1,2,3"`
	TemplateID []int  `json:"templateId,omitempty" doc:"Filter by budget template IDs" example:"1,2"`
	AccountID  []int  `json:"accountId,omitempty" doc:"Filter by account IDs" example:"1,2"`
	CategoryID []int  `json:"categoryId,omitempty" doc:"Filter by category IDs" example:"5,6"`
	Page       int    `json:"page" doc:"Page number for pagination" example:"1" minimum:"1" default:"1"`
	Limit      int    `json:"limit" doc:"Number of items per page" example:"10" minimum:"1" maximum:"100" default:"10"`
	OrderBy    string `json:"orderBy" doc:"Field to order by" example:"createdAt" default:"createdAt"`
	Sort       string `json:"sort" doc:"Sort direction" enum:"asc,desc" example:"desc" default:"desc"`
}
