package constants

// Cache key prefixes for use with BuildCacheKey in Get/Fetch operations
// These are minimal prefixes used to construct cache keys for fetching cached data
const (
	// Account cache prefixes
	AccountCacheKeyPrefix       = "account:"
	AccountsPagedCacheKeyPrefix = "account:paged:"

	// Category cache prefixes
	CategoryCacheKeyPrefix        = "category:"
	CategoriesPagedCacheKeyPrefix = "category:paged:"

	// Transaction cache prefixes
	TransactionCacheKeyPrefix               = "transaction:"
	TransactionsPagedCacheKeyPrefix         = "transaction:paged:"
	TransactionTagCacheKeyPrefix            = "transaction_tag:"
	TransactionTagsPagedCacheKeyPrefix      = "transaction_tag:paged:"
	TransactionRelationCacheKeyPrefix       = "transaction_relation:"
	TransactionRelationsPagedCacheKeyPrefix = "transaction_relation:paged:"

	// Budget cache prefixes
	BudgetCacheKeyPrefix               = "budget:"
	BudgetsPagedCacheKeyPrefix         = "budget:paged:"
	BudgetTemplateCacheKeyPrefix       = "budget_template:"
	BudgetTemplatesPagedCacheKeyPrefix = "budget_template:paged:"

	// Tag cache prefixes
	TagCacheKeyPrefix       = "tag:"
	TagsPagedCacheKeyPrefix = "tag:paged:"

	// Transaction Template cache prefixes
	TransactionTemplateCacheKeyPrefix       = "transaction_template:"
	TransactionTemplatesPagedCacheKeyPrefix = "transaction_template:paged:"

	// Account Statistics cache prefixes
	AccountStatisticsCacheKeyPrefix = "account:statistics:"

	// Category Statistics cache prefixes
	CategoryStatisticsCacheKeyPrefix = "category:statistics:"

	// Budget Template related budgets pattern (used by GetRelatedBudgets)
	BudgetTemplateRelatedBudgetsCacheKeyPattern = "budget_template:%d_budgets_paged:"

	// Summary cache prefixes
	SummaryTransactionCacheKeyPrefix = "summary:transaction:"
	SummaryAccountCacheKeyPrefix     = "summary:account:"
	SummaryCategoryCacheKeyPrefix    = "summary:category:"
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
	"account": {
		"account:detail:*",
		"account:paged:*",
		"account:statistics:{accountId}:*:*",
		"summary:account:*",
	},
	"category": {
		"category:detail:*",
		"category:paged:*",
		"category:statistics:{categoryId}:*:*",
		"summary:category:*",
	},
	"transaction": {
		"transaction:detail:*",
		"transaction:paged:*",
		"account:detail:*",
		"account:paged:*",
		"account:statistics:{accountId}:*:*",
		"category:detail:*",
		"category:statistics:{categoryId}:*:*",
		"budget:detail:*",
		"budget:paged:*",
		"summary:transaction:*",
		"summary:account:*",
		"summary:category:*",
	},
	"transaction_tag": {
		"transaction_tag:detail:*",
		"transaction_tag:paged:*",
		"transaction:detail:*",
		"transaction:paged:*",
	},
	"transaction_relation": {
		"transaction_relation:detail:*",
		"transaction_relation:paged:*",
	},
	"budget": {
		"budget:detail:*",
		"budget:paged:*",
		"account:statistics:{accountId}:*:*",
		"category:statistics:{categoryId}:*:*",
	},
	"budget_template": {
		"budget_template:detail:*",
		"budget_template:paged:*",
		"budget_template:{templateId}:budgets:paged:*",
	},
	"tag": {
		"tag:detail:*",
		"tag:paged:*",
	},
	"transaction_template": {
		"transaction_template:detail:*",
		"transaction_template:paged:*",
	},
}
