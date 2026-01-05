package schemas

import "time"

// SummaryTagitem represents a summary item for a specific tag
type SummaryTagitem struct {
	TagID          int    `json:"tagId"`
	TagName        string `json:"tagName"`
	TotalCount     int    `json:"totalCount"`
	IncomeCount    int    `json:"incomeCount"`
	ExpenseCount   int    `json:"expenseCount"`
	TransferCount  int    `json:"transferCount"`
	IncomeAmount   int64  `json:"incomeAmount"`
	ExpenseAmount  int64  `json:"expenseAmount"`
	TransferAmount int64  `json:"transferAmount"`
	Net            int64  `json:"net"`
}

// SummaryTagSchema represents the response for tag summary
type SummaryTagSchema struct {
	Data []SummaryTagitem `json:"data"`
}

// SummaryTagParamSchema represents query parameters for tag summary
type SummaryTagParamSchema struct {
	StartDate   time.Time `query:"startDate" doc:"Filter transactions from this date (ISO 8601)"  format:"date-time" example:"2024-01-01T00:00:00Z"`
	EndDate     time.Time `query:"endDate" doc:"Filter transactions until this date (ISO 8601)" format:"date-time" example:"2024-12-31T23:59:59Z"`
	Type        string    `query:"type" enum:"income,expense,transfer" doc:"Filter by transaction type"`
	AccountIDs  []int     `query:"accountIds" doc:"Filter by account IDs (comma-separated)"`
	CategoryIDs []int     `query:"categoryIds" doc:"Filter by category IDs (comma-separated)"`
	TagNames    []string  `query:"tagNames" doc:"Filter by tag names (comma-separated)"`
}
