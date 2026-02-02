package models

import "time"

// CategoryStatisticsSearchModel is the common query parameters for category statistics endpoints
type CategoryStatisticsSearchModel struct {
	StartDate time.Time `query:"startDate" required:"true" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" format:"date-time"`
	EndDate   time.Time `query:"endDate" required:"true" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" format:"date-time"`
}

// CategoryStatisticSpendingVelocityDataPoint represents spending for a single month
type CategoryStatisticSpendingVelocityDataPoint struct {
	Month  string `json:"month" doc:"Month (YYYY-MM)" example:"2024-01"`
	Amount int64  `json:"amount" doc:"Total spending in cents" example:"2500000"`
}

// CategoryStatisticSpendingVelocityModel shows spending trend over time (line chart)
type CategoryStatisticSpendingVelocityModel struct {
	Data []CategoryStatisticSpendingVelocityDataPoint `json:"data" doc:"Monthly spending data for line chart"`
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
	TransactionCount int64 `json:"transactionCount" doc:"Total number of transactions" example:"120"`
	AverageAmount    int64 `json:"averageAmount" doc:"Average transaction amount in cents" example:"25000"`
	MinAmount        int64 `json:"minAmount" doc:"Minimum transaction amount in cents" example:"5000"`
	MaxAmount        int64 `json:"maxAmount" doc:"Maximum transaction amount in cents" example:"500000"`
	MedianAmount     int64 `json:"medianAmount" doc:"Median transaction amount in cents" example:"20000"`
}

// CategoryStatisticDayOfWeekPatternEntry represents spending pattern for a single day of week
type CategoryStatisticDayOfWeekPatternEntry struct {
	DayOfWeek        string `json:"dayOfWeek" doc:"Day of week" example:"Friday"`
	TransactionCount int64  `json:"transactionCount" doc:"Number of transactions on this day" example:"20"`
	TotalAmount      int64  `json:"totalAmount" doc:"Total spending on this day in cents" example:"500000"`
	AverageAmount    int64  `json:"averageAmount" doc:"Average spending on this day in cents" example:"25000"`
}

// CategoryStatisticDayOfWeekPatternModel shows spending patterns by day of week
type CategoryStatisticDayOfWeekPatternModel struct {
	Data []CategoryStatisticDayOfWeekPatternEntry `json:"data" doc:"Spending pattern by day of week"`
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
