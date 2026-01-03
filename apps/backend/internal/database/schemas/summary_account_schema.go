package schemas

// SummaryAccountModel represents a single account summary
type SummaryAccountModel struct {
	AccountID     int    `json:"accountId" doc:"Account ID" example:"1"`
	AccountName   string `json:"accountName" doc:"Account name" example:"Cash"`
	AccountType   string `json:"accountType" doc:"Account type" example:"expense"`
	TotalCount    int    `json:"totalCount" doc:"Total number of transactions" example:"100"`
	IncomeAmount  int    `json:"incomeAmount" doc:"Total income amount" example:"3000000"`
	ExpenseAmount int    `json:"expenseAmount" doc:"Total expense amount" example:"2500000"`
	Net           int    `json:"net" doc:"Net amount (income - expense)" example:"500000"`
}

// SummaryAccountSchema represents the response for account summary endpoint
type SummaryAccountSchema struct {
	Data []SummaryAccountModel `json:"data" doc:"Summary data grouped by account"`
}
