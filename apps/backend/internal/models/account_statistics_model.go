package models

import "time"

// AccountStatisticsSearchModel is the common query parameters for statistics endpoints
type AccountStatisticsSearchModel struct {
	StartDate time.Time `query:"startDate" required:"true" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" format:"date-time"`
	EndDate   time.Time `query:"endDate" required:"true" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" format:"date-time"`
}

// AccountStatisticsCategoryHeatmapEntry represents spending data for a single category
type AccountStatisticsCategoryHeatmapEntry struct {
	CategoryID        int64   `json:"categoryId" doc:"Category ID" example:"1"`
	CategoryName      string  `json:"categoryName" doc:"Category name" example:"Food"`
	TotalCount        int     `json:"totalCount" doc:"Total number of transactions" example:"25"`
	TotalAmount       int64   `json:"totalAmount" doc:"Total spending amount in cents" example:"1500000"`
	PercentageOfTotal float64 `json:"percentageOfTotal" doc:"Percentage of total spending" example:"15.5"`
}

// AccountStatisticsCategoryHeatmapModel contains category-based spending distribution
type AccountStatisticsCategoryHeatmapModel struct {
	Data          []AccountStatisticsCategoryHeatmapEntry `json:"data" doc:"Category spending data"`
	TotalSpending int64                                   `json:"totalSpending" doc:"Total spending in the period" example:"9680000"`
	CategoryCount int                                     `json:"categoryCount" doc:"Number of categories with transactions" example:"10"`
}

// AccountStatisticsMonthlyVelocityEntry represents spending velocity for a single month
type AccountStatisticsMonthlyVelocityEntry struct {
	Period         string `json:"period" doc:"Month period (YYYY-MM)" example:"2024-01"`
	TotalCount     int    `json:"totalCount" doc:"Total transactions in month" example:"150"`
	IncomeCount    int    `json:"incomeCount" doc:"Income transactions" example:"50"`
	ExpenseCount   int    `json:"expenseCount" doc:"Expense transactions" example:"95"`
	TransferCount  int    `json:"transferCount" doc:"Transfer transactions" example:"5"`
	IncomeAmount   int64  `json:"incomeAmount" doc:"Total income amount in cents" example:"5000000"`
	ExpenseAmount  int64  `json:"expenseAmount" doc:"Total expense amount in cents" example:"3500000"`
	TransferAmount int64  `json:"transferAmount" doc:"Total transfer amount in cents" example:"500000"`
	Net            int64  `json:"net" doc:"Net amount (income - expense) in cents" example:"1500000"`
	DailyAverage   int64  `json:"dailyAverage" doc:"Average daily spending in cents" example:"112903"`
}

// AccountStatisticsMonthlyVelocityModel contains month-over-month spending velocity
type AccountStatisticsMonthlyVelocityModel struct {
	Data                []AccountStatisticsMonthlyVelocityEntry `json:"data" doc:"Monthly velocity data"`
	AverageMonthlySpend int64                                   `json:"averageMonthlySpend" doc:"Average monthly spending in cents" example:"3500000"`
	TrendDirection      string                                  `json:"trendDirection" enum:"increasing,decreasing,stable" doc:"Spending trend direction" example:"increasing"`
}

// AccountStatisticsTimeFrequencyEntry represents frequency distribution of transactions
type AccountStatisticsTimeFrequencyEntry struct {
	Frequency string `json:"frequency" doc:"Time frequency (e.g., daily, weekly, monthly)" example:"weekly"`
	Count     int    `json:"count" doc:"Number of transactions at this frequency" example:"45"`
}

// AccountStatisticsTimeFrequencyHeatmapModel contains transaction frequency distribution by time
type AccountStatisticsTimeFrequencyHeatmapModel struct {
	Data              []AccountStatisticsTimeFrequencyEntry `json:"data" doc:"Frequency distribution data"`
	MostCommonPattern string                                `json:"mostCommonPattern" doc:"Most common transaction frequency" example:"weekly"`
	TotalTransactions int                                   `json:"totalTransactions" doc:"Total transactions in period" example:"240"`
}

// AccountStatisticsResponse is the top-level response for account statistics
type AccountStatisticsResponse struct {
	AccountID            int64                                      `json:"accountId" doc:"Account ID" example:"1"`
	Period               string                                     `json:"period" doc:"Period covered (ISO 8601)" example:"2024-01-01T00:00:00Z to 2024-12-31T23:59:59Z"`
	CategoryHeatmap      AccountStatisticsCategoryHeatmapModel      `json:"categoryHeatmap" doc:"Category spending distribution"`
	MonthlyVelocity      AccountStatisticsMonthlyVelocityModel      `json:"monthlyVelocity" doc:"Monthly spending velocity"`
	TimeFrequencyHeatmap AccountStatisticsTimeFrequencyHeatmapModel `json:"timeFrequencyHeatmap" doc:"Transaction frequency distribution"`
}

// AccountStatisticsCashFlowDataPoint represents a single data point in the cash flow trend
type AccountStatisticsCashFlowDataPoint struct {
	Date    string `json:"date" doc:"Date (YYYY-MM-DD)" example:"2024-01-15"`
	Balance int64  `json:"balance" doc:"Account balance at this date in cents" example:"5000000"`
}

// AccountStatisticsCashFlowPulseModel contains the balance trend over time
type AccountStatisticsCashFlowPulseModel struct {
	Data            []AccountStatisticsCashFlowDataPoint `json:"data" doc:"Daily balance data points"`
	StartingBalance int64                                `json:"startingBalance" doc:"Balance at the start of the period in cents" example:"10000000"`
	EndingBalance   int64                                `json:"endingBalance" doc:"Balance at the end of the period in cents" example:"5000000"`
	MinBalance      int64                                `json:"minBalance" doc:"Minimum balance during the period in cents" example:"3000000"`
	MaxBalance      int64                                `json:"maxBalance" doc:"Maximum balance during the period in cents" example:"10000000"`
	TrendDirection  string                               `json:"trendDirection" enum:"increasing,decreasing,stable" doc:"Overall trend direction" example:"decreasing"`
}

// AccountStatisticsBurnRateModel contains spending rate information
type AccountStatisticsBurnRateModel struct {
	DailyAverageSpend   int64  `json:"dailyAverageSpend" doc:"Average daily spending in cents" example:"150000"`
	WeeklyAverageSpend  int64  `json:"weeklyAverageSpend" doc:"Average weekly spending in cents" example:"1050000"`
	MonthlyAverageSpend int64  `json:"monthlyAverageSpend" doc:"Average monthly spending in cents" example:"4500000"`
	TotalSpending       int64  `json:"totalSpending" doc:"Total spending in the period in cents" example:"90000000"`
	DaysRemaining       int    `json:"daysRemaining" doc:"Estimated days until budget limit (if active budget exists)" example:"10"`
	SpendingDays        int    `json:"spendingDays" doc:"Number of days with spending" example:"28"`
	BudgetLimitStatus   string `json:"budgetLimitStatus" enum:"within,at-risk,exceeded,no-budget" doc:"Status relative to active budget" example:"at-risk"`
}

// AccountStatisticsBudgetHealthEntry represents health status of a single budget
type AccountStatisticsBudgetHealthEntry struct {
	BudgetID       int64   `json:"budgetId" doc:"Budget ID" example:"1"`
	BudgetName     string  `json:"budgetName" doc:"Budget name" example:"Monthly Groceries"`
	PeriodStart    string  `json:"periodStart" doc:"Period start (YYYY-MM-DD)" example:"2024-01-01"`
	PeriodEnd      string  `json:"periodEnd" doc:"Period end (YYYY-MM-DD)" example:"2024-01-31"`
	AmountLimit    int64   `json:"amountLimit" doc:"Budget limit in cents" example:"5000000"`
	AmountSpent    int64   `json:"amountSpent" doc:"Amount spent in cents" example:"3500000"`
	PercentageUsed float64 `json:"percentageUsed" doc:"Percentage of budget used" example:"70.0"`
	Status         string  `json:"status" enum:"on-track,warning,exceeded,active,inactive,past" doc:"Budget health status" example:"on-track"`
	DaysRemaining  int     `json:"daysRemaining" doc:"Days remaining in budget period" example:"10"`
}

// AccountStatisticsBudgetHealthModel contains budget health information
type AccountStatisticsBudgetHealthModel struct {
	ActiveBudgets   []AccountStatisticsBudgetHealthEntry `json:"activeBudgets" doc:"Currently active budgets"`
	PastBudgets     []AccountStatisticsBudgetHealthEntry `json:"pastBudgets" doc:"Past/completed budgets"`
	OverallStatus   string                               `json:"overallStatus" enum:"healthy,at-risk,concerning" doc:"Overall budget health status" example:"healthy"`
	TotalBudgets    int                                  `json:"totalBudgets" doc:"Total number of budgets (active and past)" example:"15"`
	AchievementRate float64                              `json:"achievementRate" doc:"Percentage of budgets successfully completed on track" example:"80.0"`
}
