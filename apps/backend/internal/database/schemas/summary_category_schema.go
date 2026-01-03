package schemas

// SummaryCategoryModel represents a single category summary
type SummaryCategoryModel struct {
	CategoryID    int    `json:"categoryId" doc:"Category ID" example:"1"`
	CategoryName  string `json:"categoryName" doc:"Category name" example:"Food"`
	CategoryType  string `json:"categoryType" doc:"Category type" example:"expense"`
	TotalCount    int    `json:"totalCount" doc:"Total number of transactions" example:"75"`
	IncomeAmount  int    `json:"incomeAmount" doc:"Total income amount" example:"0"`
	ExpenseAmount int    `json:"expenseAmount" doc:"Total expense amount" example:"1500000"`
	Net           int    `json:"net" doc:"Net amount (income - expense)" example:"-1500000"`
}

// SummaryCategorySchema represents the response for category summary endpoint
type SummaryCategorySchema struct {
	Data []SummaryCategoryModel `json:"data" doc:"Summary data grouped by category"`
}
