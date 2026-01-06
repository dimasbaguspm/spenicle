package schemas

// TotalSummaryParamModel defines the query parameters for total summary endpoint
type TotalSummaryParamModel struct {
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format, optional)" format:"date-time" example:"2024-01-01T00:00:00Z"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format, optional)" format:"date-time" example:"2024-12-31T23:59:59Z"`
}

// TotalSummarySchema defines the response for total transaction summary
type TotalSummarySchema struct {
	Expense           int64 `json:"expense" doc:"Total expense amount" example:"3500000"`
	Income            int64 `json:"income" doc:"Total income amount" example:"5000000"`
	Transfer          int64 `json:"transfer" doc:"Total transfer amount" example:"500000"`
	TotalTransactions int64 `json:"totalTransactions" doc:"Total number of all transactions" example:"220"`
}
