package constants

// Cache key prefixes for consistency across services
const (
	AccountCacheKeyPrefix                       = "account:"
	AccountsPagedCacheKeyPrefix                 = "accounts_paged:"
	AccountStatisticsCacheKeyPrefix             = "account_statistics:"
	CategoryCacheKeyPrefix                      = "category:"
	CategoriesPagedCacheKeyPrefix               = "categories_paged:"
	BudgetCacheKeyPrefix                        = "budget:"
	BudgetsPagedCacheKeyPrefix                  = "budgets_paged:"
	BudgetTemplateCacheKeyPrefix                = "budget_template:"
	BudgetTemplatesPagedCacheKeyPrefix          = "budget_templates_paged:"
	BudgetTemplateRelatedBudgetsCacheKeyPattern = "budget_template:%d_budgets_paged:"
	TagCacheKeyPrefix                           = "tag:"
	TagsPagedCacheKeyPrefix                     = "tags_paged:"
	TransactionCacheKeyPrefix                   = "transaction:"
	TransactionsPagedCacheKeyPrefix             = "transactions_paged:"
	TransactionTemplateCacheKeyPrefix           = "transaction_template:"
	TransactionTemplatesPagedCacheKeyPrefix     = "transaction_templates_paged:"
	TransactionTagCacheKeyPrefix                = "transaction_tag:"
	TransactionTagsPagedCacheKeyPrefix          = "transaction_tags_paged:"
	TransactionRelationCacheKeyPrefix           = "transaction_relation:"
	TransactionRelationsPagedCacheKeyPrefix     = "transaction_relations_paged:"
	SummaryTransactionCacheKeyPrefix            = "summary_transaction:"
	SummaryAccountCacheKeyPrefix                = "summary_account:"
	SummaryCategoryCacheKeyPrefix               = "summary_category:"
)

// Account Statistics cache method suffixes
const (
	AccountStatisticsCategoryHeatmapSuffix = "category_heatmap"
	AccountStatisticsMonthlyVelocitySuffix = "monthly_velocity"
	AccountStatisticsTimeFrequencySuffix   = "time_frequency"
	AccountStatisticsCashFlowPulseSuffix   = "cash_flow_pulse"
	AccountStatisticsBurnRateSuffix        = "burn_rate"
	AccountStatisticsBudgetHealthSuffix    = "budget_health"
)

// Category Statistics cache key prefix and method suffixes
const (
	CategoryStatisticsCacheKeyPrefix            = "category_statistics:"
	CategoryStatisticsSpendingVelocitySuffix    = "spending_velocity"
	CategoryStatisticsAccountDistributionSuffix = "account_distribution"
	CategoryStatisticsTransactionSizeSuffix     = "transaction_size"
	CategoryStatisticsDayOfWeekPatternSuffix    = "day_of_week_pattern"
	CategoryStatisticsBudgetUtilizationSuffix   = "budget_utilization"
)

// Cache invalidation wildcard patterns for dependent caches
// These patterns are used when a data change affects multiple cached entries
const (
	// Account and category statistics invalidation patterns
	AccountStatisticsWildcardPattern  = "account_statistics:*"
	CategoryStatisticsWildcardPattern = "category_statistics:*"
	AccountWildcardPattern            = "account:*"
	AccountsPagedWildcardPattern      = "accounts_paged:*"

	// Budget cache invalidation patterns
	BudgetWildcardPattern                = "budget:*"
	BudgetsPagedWildcardPattern          = "budgets_paged:*"
	BudgetTemplateWildcardPattern        = "budget_template:*"
	BudgetTemplatesPagedWildcardPattern  = "budget_templates_paged:*"
	BudgetTemplateRelatedWildcardPattern = "budget_template:*_budgets_paged:*"

	// Category cache invalidation patterns
	CategoriesPagedWildcardPattern = "categories_paged:*"
)
