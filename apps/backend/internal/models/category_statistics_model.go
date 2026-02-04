package models

import "time"

// CategoryStatisticsSearchModel is the common query parameters for category statistics endpoints
type CategoryStatisticsSearchModel struct {
	StartDate time.Time `query:"startDate" required:"true" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" format:"date-time"`
	EndDate   time.Time `query:"endDate" required:"true" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" format:"date-time"`
}

// CategoryStatisticSpendingVelocityDataPoint represents spending for a single month
type CategoryStatisticSpendingVelocityDataPoint struct {
	Month            string  `json:"month" doc:"Month (YYYY-MM)" example:"2024-01"`
	Amount           int64   `json:"amount" doc:"Total expense amount in cents (legacy field)" example:"2500000"`
	TotalCount       int     `json:"totalCount" doc:"Total transactions in month" example:"45"`
	IncomeCount      int     `json:"incomeCount" doc:"Income transaction count" example:"10"`
	ExpenseCount     int     `json:"expenseCount" doc:"Expense transaction count" example:"35"`
	IncomeAmount     int64   `json:"incomeAmount" doc:"Total income in cents" example:"5000000"`
	ExpenseAmount    int64   `json:"expenseAmount" doc:"Total expense in cents" example:"2500000"`
	Net              int64   `json:"net" doc:"Net flow (income - expense) in cents" example:"2500000"`
	IncomePercentage float64 `json:"incomePercentage" doc:"Percentage of income vs total volume" example:"66.67"`
}

// CategoryStatisticSpendingVelocityModel shows spending trend over time (line chart)
type CategoryStatisticSpendingVelocityModel struct {
	Data                []CategoryStatisticSpendingVelocityDataPoint `json:"data" doc:"Monthly spending data for line chart"`
	TotalIncome         int64                                        `json:"totalIncome" doc:"Sum of all income across months in cents" example:"50000000"`
	TotalExpense        int64                                        `json:"totalExpense" doc:"Sum of all expense across months in cents" example:"30000000"`
	NetFlow             int64                                        `json:"netFlow" doc:"Total net (income - expense) in cents" example:"20000000"`
	TrendDirection      string                                       `json:"trendDirection" enum:"increasing,decreasing,stable" doc:"Spending trend direction" example:"stable"`
	AverageMonthlySpend int64                                        `json:"averageMonthlySpend" doc:"Average monthly expense in cents" example:"2500000"`
}

// CategoryStatisticAccountDistributionEntry represents spending by a single account
type CategoryStatisticAccountDistributionEntry struct {
	AccountID   int64   `json:"accountId" doc:"Account ID" example:"1"`
	AccountName string  `json:"accountName" doc:"Account name" example:"Credit Card"`
	Amount      int64   `json:"amount" doc:"Total spending from this account in cents" example:"2250000"`
	Percentage  float64 `json:"percentage" doc:"Percentage of total spending" example:"75.0"`
}

// CategoryStatisticAccountDistributionModel shows which accounts pay for this category (donut chart)
type CategoryStatisticAccountDistributionModel struct {
	Accounts      []CategoryStatisticAccountDistributionEntry `json:"accounts" doc:"Account spending distribution"`
	TotalSpending int64                                       `json:"totalSpending" doc:"Total spending in cents" example:"3000000"`
}

// CategoryStatisticAverageTransactionSizeModel shows typical transaction amounts
type CategoryStatisticAverageTransactionSizeModel struct {
	TransactionCount     int64   `json:"transactionCount" doc:"Total number of transactions" example:"120"`
	AverageAmount        int64   `json:"averageAmount" doc:"Average expense transaction amount in cents" example:"25000"`
	MinAmount            int64   `json:"minAmount" doc:"Minimum expense transaction amount in cents" example:"5000"`
	MaxAmount            int64   `json:"maxAmount" doc:"Maximum expense transaction amount in cents" example:"500000"`
	MedianAmount         int64   `json:"medianAmount" doc:"Median expense transaction amount in cents" example:"20000"`
	ExpenseCount         int64   `json:"expenseCount" doc:"Expense transaction count" example:"80"`
	IncomeCount          int64   `json:"incomeCount" doc:"Income transaction count" example:"40"`
	AverageIncomeAmount  int64   `json:"averageIncomeAmount" doc:"Average income amount in cents" example:"150000"`
	MinIncomeAmount      int64   `json:"minIncomeAmount" doc:"Minimum income amount in cents" example:"50000"`
	MaxIncomeAmount      int64   `json:"maxIncomeAmount" doc:"Maximum income amount in cents" example:"1000000"`
	MedianIncomeAmount   int64   `json:"medianIncomeAmount" doc:"Median income amount in cents" example:"100000"`
	IncomeToExpenseRatio float64 `json:"incomeToExpenseRatio" doc:"Ratio of income/expense counts" example:"0.5"`
}

// CategoryStatisticDayOfWeekPatternEntry represents spending pattern for a single day of week
type CategoryStatisticDayOfWeekPatternEntry struct {
	DayOfWeek        string `json:"dayOfWeek" doc:"Day of week" example:"Friday"`
	TransactionCount int64  `json:"transactionCount" doc:"Number of transactions on this day" example:"20"`
	TotalAmount      int64  `json:"totalAmount" doc:"Total expense amount on this day in cents" example:"500000"`
	AverageAmount    int64  `json:"averageAmount" doc:"Average expense amount on this day in cents" example:"25000"`
	ExpenseCount     int64  `json:"expenseCount" doc:"Expense transactions on this day" example:"15"`
	IncomeCount      int64  `json:"incomeCount" doc:"Income transactions on this day" example:"5"`
	ExpenseTotal     int64  `json:"expenseTotal" doc:"Total expense amount in cents" example:"500000"`
	IncomeTotal      int64  `json:"incomeTotal" doc:"Total income amount in cents" example:"750000"`
	ExpenseAverage   int64  `json:"expenseAverage" doc:"Average expense amount in cents" example:"33333"`
	IncomeAverage    int64  `json:"incomeAverage" doc:"Average income amount in cents" example:"150000"`
}

// CategoryStatisticDayOfWeekPatternModel shows spending patterns by day of week
type CategoryStatisticDayOfWeekPatternModel struct {
	Data              []CategoryStatisticDayOfWeekPatternEntry `json:"data" doc:"Spending pattern by day of week"`
	MostActiveDay     string                                   `json:"mostActiveDay" doc:"Day with highest transaction count" example:"Friday"`
	HighestSpendDay   string                                   `json:"highestSpendDay" doc:"Day with highest expense total" example:"Saturday"`
	TotalTransactions int                                      `json:"totalTransactions" doc:"Total transactions across all days" example:"150"`
}

// CategoryStatisticBudgetUtilizationEntry represents a single budget's utilization
type CategoryStatisticBudgetUtilizationEntry struct {
	BudgetID    int64     `json:"budgetId" doc:"Budget ID" example:"1"`
	Name        string    `json:"name" doc:"Budget name" example:"Food Budget"`
	Limit       int64     `json:"limit" doc:"Budget limit in cents" example:"1000000"`
	Spent       int64     `json:"spent" doc:"Amount spent in cents" example:"750000"`
	Remaining   int64     `json:"remaining" doc:"Remaining budget in cents" example:"250000"`
	Utilization float64   `json:"utilization" doc:"Percentage of budget utilized" example:"75.0"`
	PeriodStart time.Time `json:"periodStart" doc:"Budget period start date"`
	PeriodEnd   time.Time `json:"periodEnd" doc:"Budget period end date"`
}

// CategoryStatisticBudgetUtilizationModel shows budget progress for this category
type CategoryStatisticBudgetUtilizationModel struct {
	Budgets []CategoryStatisticBudgetUtilizationEntry `json:"budgets" doc:"Budget utilization data"`
}

// CategoryStatisticsResponse contains all category statistics
type CategoryStatisticsResponse struct {
	SpendingVelocity       CategoryStatisticSpendingVelocityModel       `json:"spendingVelocity" doc:"Spending trend over time"`
	AccountDistribution    CategoryStatisticAccountDistributionModel    `json:"accountDistribution" doc:"Which accounts pay for this category"`
	AverageTransactionSize CategoryStatisticAverageTransactionSizeModel `json:"averageTransactionSize" doc:"Typical transaction amounts"`
	DayOfWeekPattern       CategoryStatisticDayOfWeekPatternModel       `json:"dayOfWeekPattern" doc:"Spending patterns by day of week"`
	BudgetUtilization      CategoryStatisticBudgetUtilizationModel      `json:"budgetUtilization" doc:"Budget progress"`
}
