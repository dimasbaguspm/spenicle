package schemas

// SummaryTransactionItem represents a single transaction summary grouped by period
type SummaryTransactionItem struct {
	Period         string `json:"period" doc:"Time period (e.g., 2024-01, 2024-W01, 2024-01-01, 2024)" example:"2024-01"`
	TotalCount     int    `json:"totalCount" doc:"Total number of transactions" example:"150"`
	IncomeCount    int    `json:"incomeCount" doc:"Number of income transactions" example:"50"`
	ExpenseCount   int    `json:"expenseCount" doc:"Number of expense transactions" example:"95"`
	TransferCount  int    `json:"transferCount" doc:"Number of transfer transactions" example:"5"`
	IncomeAmount   int    `json:"incomeAmount" doc:"Total income amount" example:"5000000"`
	ExpenseAmount  int    `json:"expenseAmount" doc:"Total expense amount" example:"3500000"`
	TransferAmount int    `json:"transferAmount" doc:"Total transfer amount" example:"500000"`
	Net            int    `json:"net" doc:"Net amount (income - expense)" example:"1500000"`
}

// SummaryTransactionSchema represents the response for transaction summary endpoint
type SummaryTransactionSchema struct {
	Frequency string                   `json:"frequency" doc:"Grouping frequency" example:"monthly"`
	Data      []SummaryTransactionItem `json:"data" doc:"Summary data grouped by period"`
}
