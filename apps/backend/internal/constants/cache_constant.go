package constants

import "time"

// Entity names for consistent cache key construction
const (
	EntityAccount             = "account"
	EntityCategory            = "category"
	EntityTransaction         = "transaction"
	EntityTransactionTag      = "transaction_tag"
	EntityTransactionRelation = "transaction_relation"
	EntityBudget              = "budget"
	EntityBudgetTemplate      = "budget_template"
	EntityTag                 = "tag"
	EntityTransactionTemplate = "transaction_template"
)

// Summary entity names for summary cache keys
const (
	SummaryAccount     = "summary:account"
	SummaryCategory    = "summary:category"
	SummaryTransaction = "summary:transaction"
	SummaryGeospatial  = "summary:geospatial"
)

// Cache keys for special features
const (
	BulkDraftKey = "bulk_draft" // Global bulk transaction draft key
)

// Cache TTLs for different cache operation types
const (
	CacheTTLDetail     = 10 * time.Minute // Detail queries (single item)
	CacheTTLPaged      = 5 * time.Minute  // Paged queries (list operations)
	CacheTTLStatistics = 30 * time.Minute // Statistics queries (expensive to compute)
	CacheTTLSummary    = 5 * time.Minute  // Summary queries
	CacheTTLBulkDraft  = 24 * time.Hour   // Bulk transaction draft savepoint
)

// Statistics method types
const (
	AccountStatisticsCategoryHeatmapSuffix = "category_heatmap"
	AccountStatisticsMonthlyVelocitySuffix = "monthly_velocity"
	AccountStatisticsTimeFrequencySuffix   = "time_frequency"
	AccountStatisticsCashFlowPulseSuffix   = "cash_flow_pulse"
	AccountStatisticsBurnRateSuffix        = "burn_rate"
	AccountStatisticsBudgetHealthSuffix    = "budget_health"

	CategoryStatisticsSpendingVelocitySuffix    = "spending_velocity"
	CategoryStatisticsAccountDistributionSuffix = "account_distribution"
	CategoryStatisticsTransactionSizeSuffix     = "transaction_size"
	CategoryStatisticsDayOfWeekPatternSuffix    = "day_of_week_pattern"
	CategoryStatisticsBudgetUtilizationSuffix   = "budget_utilization"
)

// EntityCachePatterns maps entity names to their associated cache patterns
// Patterns use entity-qualified placeholders like {accountId}, {transactionId}, etc.
// Wildcard patterns (*) apply to all variations of that cache type
var EntityCachePatterns = map[string][]string{
	EntityAccount: {
		"account:detail:*",
		"account:paged:*",
		"account:statistics:{accountId}:*:*",
		SummaryAccount + ":*",
	},
	EntityCategory: {
		"category:detail:*",
		"category:paged:*",
		"category:statistics:{categoryId}:*:*",
		SummaryCategory + ":*",
	},
	EntityTransaction: {
		"transaction:detail:*",
		"transaction:paged:*",
		"account:detail:*",
		"account:paged:*",
		"account:statistics:{accountId}:*:*",
		"category:detail:*",
		"category:statistics:{categoryId}:*:*",
		"budget:detail:*",
		"budget:paged:*",
		SummaryTransaction + ":*",
		SummaryAccount + ":*",
		SummaryCategory + ":*",
		SummaryGeospatial + ":*",
	},
	EntityTransactionTag: {
		"transaction_tag:detail:*",
		"transaction_tag:paged:*",
		"transaction:detail:*",
		"transaction:paged:*",
		"account:statistics:{accountId}:*:*",
	},
	EntityTransactionRelation: {
		"transaction_relation:detail:*",
		"transaction_relation:paged:*",
		"transaction:detail:*",
		"transaction:paged:*",
	},
	EntityBudget: {
		"budget:detail:*",
		"budget:paged:*",
		"account:statistics:{accountId}:*:*",
		"category:statistics:{categoryId}:*:*",
	},
	EntityBudgetTemplate: {
		"budget_template:detail:*",
		"budget_template:paged:*",
		"budget_template:{templateId}:budgets:paged:*",
	},
	EntityTag: {
		"tag:detail:*",
		"tag:paged:*",
		"transaction_tag:paged:*",
	},
	EntityTransactionTemplate: {
		"transaction_template:detail:*",
		"transaction_template:paged:*",
	},
}
