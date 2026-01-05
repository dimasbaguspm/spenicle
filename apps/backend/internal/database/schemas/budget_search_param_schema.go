package schemas

// SearchParamBudgetSchema represents search/filter parameters for budgets
type SearchParamBudgetSchema struct {
	ID          []int  `json:"id,omitempty" doc:"Filter by budget IDs" example:"1,2,3"`
	TemplateIDs []int  `json:"templateIds,omitempty" doc:"Filter by budget template IDs" example:"1,2"`
	AccountIDs  []int  `json:"accountIds,omitempty" doc:"Filter by account IDs" example:"1,2"`
	CategoryIDs []int  `json:"categoryIds,omitempty" doc:"Filter by category IDs" example:"5,6"`
	PageNumber  int    `json:"pageNumber" doc:"Page number for pagination" example:"1" minimum:"1" default:"1"`
	PageSize    int    `json:"pageSize" doc:"Number of items per page" example:"10" minimum:"1" maximum:"100" default:"10"`
	SortBy      string `json:"sortBy" doc:"Field to order by" example:"createdAt" default:"createdAt"`
	SortOrder   string `json:"sortOrder" doc:"Sort direction" enum:"asc,desc" example:"desc" default:"desc"`
}
