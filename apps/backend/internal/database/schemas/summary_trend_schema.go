package schemas

import "time"

// TrendParamSchema represents query parameters for trend analysis
type TrendParamSchema struct {
	StartDate time.Time `query:"startDate" doc:"Start date for trend analysis (required)" format:"date-time" required:"true"`
	EndDate   time.Time `query:"endDate" doc:"End date for trend analysis (required)" format:"date-time" required:"true"`
	Frequency string    `query:"frequency" default:"monthly" enum:"weekly,monthly" doc:"Trend frequency" example:"monthly"`
}

// TrendItem represents a single period's trend data
type TrendItem struct {
	Period         string  `json:"period" doc:"Time period (e.g., 2024-01, 2024-W01)" example:"2024-01"`
	TotalAmount    int64   `json:"totalAmount" doc:"Total transaction amount for the period" example:"3500000"`
	IncomeAmount   int64   `json:"incomeAmount" doc:"Total income amount" example:"5000000"`
	ExpenseAmount  int64   `json:"expenseAmount" doc:"Total expense amount" example:"3500000"`
	TransferAmount int64   `json:"transferAmount" doc:"Total transfer amount" example:"500000"`
	Net            int64   `json:"net" doc:"Net amount (income - expense)" example:"1500000"`
	Count          int     `json:"count" doc:"Number of transactions" example:"45"`
	ChangePercent  float64 `json:"changePercent" doc:"Percentage change from previous period" example:"15.5"`
	Trend          string  `json:"trend" doc:"Trend direction" enum:"increasing,decreasing,stable" example:"increasing"`
}

// AccountTrendItem represents trend data for a specific account
type AccountTrendItem struct {
	AccountID   int64       `json:"accountId" doc:"Account ID" example:"1"`
	AccountName string      `json:"accountName" doc:"Account name" example:"Checking Account"`
	Periods     []TrendItem `json:"periods" doc:"Trend data per period"`
	AvgChange   float64     `json:"avgChange" doc:"Average percentage change across periods" example:"12.5"`
	TrendStatus string      `json:"trendStatus" doc:"Overall trend status" enum:"increasing,decreasing,stable,volatile" example:"increasing"`
}

// CategoryTrendItem represents trend data for a specific category
type CategoryTrendItem struct {
	CategoryID   int64       `json:"categoryId" doc:"Category ID" example:"1"`
	CategoryName string      `json:"categoryName" doc:"Category name" example:"Food & Dining"`
	CategoryType string      `json:"categoryType" doc:"Category type" enum:"income,expense" example:"expense"`
	Periods      []TrendItem `json:"periods" doc:"Trend data per period"`
	AvgChange    float64     `json:"avgChange" doc:"Average percentage change across periods" example:"-5.2"`
	TrendStatus  string      `json:"trendStatus" doc:"Overall trend status" enum:"increasing,decreasing,stable,volatile" example:"decreasing"`
}

// AccountTrendSchema represents the response for account trend analysis
type AccountTrendSchema struct {
	Frequency string             `json:"frequency" doc:"Trend frequency" example:"monthly"`
	StartDate time.Time          `json:"startDate" doc:"Analysis start date" format:"date-time"`
	EndDate   time.Time          `json:"endDate" doc:"Analysis end date" format:"date-time"`
	Data      []AccountTrendItem `json:"data" doc:"Trend data per account"`
}

// CategoryTrendSchema represents the response for category trend analysis
type CategoryTrendSchema struct {
	Frequency string              `json:"frequency" doc:"Trend frequency" example:"monthly"`
	StartDate time.Time           `json:"startDate" doc:"Analysis start date" format:"date-time"`
	EndDate   time.Time           `json:"endDate" doc:"Analysis end date" format:"date-time"`
	Data      []CategoryTrendItem `json:"data" doc:"Trend data per category"`
}
