package models

import "time"

type SummarySearchModel struct {
	StartDate *time.Time `query:"startDate" required:"true" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z"`
	EndDate   *time.Time `query:"endDate" required:"true" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z"`
}

type SummaryTransactionSearchModel struct {
	SummarySearchModel
	Frequency string `query:"frequency" enum:"daily,weekly,monthly,yearly" default:"monthly" doc:"Grouping frequency"`
}

type SummaryTransactionModel struct {
	Period         string `json:"period" doc:"Time period (e.g., 2024-01, 2024-W01, 2024-01-01, 2024)" example:"2024-01"`
	TotalCount     int    `json:"totalCount" doc:"Total number of transactions" example:"150"`
	IncomeCount    int    `json:"incomeCount" doc:"Number of income transactions" example:"50"`
	ExpenseCount   int    `json:"expenseCount" doc:"Number of expense transactions" example:"95"`
	TransferCount  int    `json:"transferCount" doc:"Number of transfer transactions" example:"5"`
	IncomeAmount   int64  `json:"incomeAmount" doc:"Total income amount" example:"5000000"`
	ExpenseAmount  int64  `json:"expenseAmount" doc:"Total expense amount" example:"3500000"`
	TransferAmount int64  `json:"transferAmount" doc:"Total transfer amount" example:"500000"`
	Net            int64  `json:"net" doc:"Net amount (income - expense)" example:"1500000"`
}

type SummaryTransactionListModel struct {
	Frequency string                    `json:"frequency" doc:"Grouping frequency" example:"monthly"`
	Data      []SummaryTransactionModel `json:"data" doc:"Summary data grouped by period"`
}

type SummaryAccountModel struct {
	ID            int64  `json:"id" doc:"Account ID" example:"1"`
	Name          string `json:"name" doc:"Account name" example:"Cash"`
	Type          string `json:"type" enum:"income,expense" doc:"Account type" example:"expense"`
	TotalCount    int    `json:"totalCount" doc:"Total number of transactions" example:"100"`
	IncomeAmount  int64  `json:"incomeAmount" doc:"Total income amount" example:"3000000"`
	ExpenseAmount int64  `json:"expenseAmount" doc:"Total expense amount" example:"2500000"`
	Net           int64  `json:"net" doc:"Net amount (income - expense)" example:"500000"`
}

type SummaryAccountListModel struct {
	Items []SummaryAccountModel `json:"items" doc:"Summary data grouped by account"`
}

type SummaryCategoryModel struct {
	ID            int64  `json:"id" doc:"Category ID" example:"1"`
	Name          string `json:"name" doc:"Category name" example:"Food"`
	Type          string `json:"type" enum:"income,expense,transfer" doc:"Category type" example:"expense"`
	TotalCount    int    `json:"totalCount" doc:"Total number of transactions" example:"75"`
	IncomeAmount  int64  `json:"incomeAmount" doc:"Total income amount" example:"0"`
	ExpenseAmount int64  `json:"expenseAmount" doc:"Total expense amount" example:"1500000"`
	Net           int64  `json:"net" doc:"Net amount (income - expense)" example:"-1500000"`
}

type SummaryCategoryListModel struct {
	Data []SummaryCategoryModel `json:"data" doc:"Summary data grouped by category"`
}
