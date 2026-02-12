package models

import "time"

type SummarySearchModel struct {
	StartDate time.Time `query:"startDate" required:"true" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" format:"date-time"`
	EndDate   time.Time `query:"endDate" required:"true" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" format:"date-time"`
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
	Data []SummaryAccountModel `json:"data" doc:"Summary data grouped by account"`
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

type SummaryGeospatialSearchModel struct {
	SummarySearchModel
	Latitude      float64 `query:"latitude" required:"true" minimum:"-90" maximum:"90" doc:"Center latitude for geographic search" example:"-6.175"`
	Longitude     float64 `query:"longitude" required:"true" minimum:"-180" maximum:"180" doc:"Center longitude for geographic search" example:"106.827"`
	RadiusMeters  int     `query:"radiusMeters" default:"5000" minimum:"100" maximum:"50000" doc:"Search radius in meters" example:"5000"`
	GridPrecision int     `query:"gridPrecision" default:"3" minimum:"1" maximum:"4" doc:"Grid cell precision (1=~11km, 2=~1.1km, 3=~110m, 4=~11m)" example:"3"`
}

type SummaryGeospatialGridCell struct {
	GridLat          float64 `json:"gridLat" doc:"Grid cell center latitude" example:"-6.175"`
	GridLon          float64 `json:"gridLon" doc:"Grid cell center longitude" example:"106.827"`
	TransactionCount int     `json:"transactionCount" doc:"Total number of transactions in this grid cell" example:"45"`
	TotalAmount      int64   `json:"totalAmount" doc:"Total transaction amount in this grid cell" example:"5000000"`
	IncomeAmount     int64   `json:"incomeAmount" doc:"Total income amount" example:"2000000"`
	ExpenseAmount    int64   `json:"expenseAmount" doc:"Total expense amount" example:"3000000"`
	IncomeCount      int     `json:"incomeCount" doc:"Number of income transactions" example:"15"`
	ExpenseCount     int     `json:"expenseCount" doc:"Number of expense transactions" example:"28"`
	TransferCount    int     `json:"transferCount" doc:"Number of transfer transactions" example:"2"`
}

type SummaryGeospatialListModel struct {
	CenterLat     float64                      `json:"centerLat" doc:"Search center latitude" example:"-6.175"`
	CenterLon     float64                      `json:"centerLon" doc:"Search center longitude" example:"106.827"`
	RadiusMeters  int                          `json:"radiusMeters" doc:"Search radius in meters" example:"5000"`
	GridPrecision int                          `json:"gridPrecision" doc:"Grid cell precision level" example:"3"`
	TotalCells    int                          `json:"totalCells" doc:"Total number of grid cells with transactions" example:"8"`
	Data          []SummaryGeospatialGridCell  `json:"data" doc:"Grid cells with aggregated transaction data"`
}
