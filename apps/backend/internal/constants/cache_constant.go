package constants

// Cache key prefixes for consistency across services
const (
	AccountCacheKeyPrefix                   = "account:"
	AccountsPagedCacheKeyPrefix             = "accounts_paged:"
	AccountStatisticsCacheKeyPrefix         = "account_statistics:"
	CategoryCacheKeyPrefix                  = "category:"
	CategoriesPagedCacheKeyPrefix           = "categories_paged:"
	BudgetCacheKeyPrefix                    = "budget:"
	BudgetsPagedCacheKeyPrefix              = "budgets_paged:"
	BudgetTemplateCacheKeyPrefix            = "budget_template:"
	BudgetTemplatesPagedCacheKeyPrefix      = "budget_templates_paged:"
	TagCacheKeyPrefix                       = "tag:"
	TagsPagedCacheKeyPrefix                 = "tags_paged:"
	TransactionCacheKeyPrefix               = "transaction:"
	TransactionsPagedCacheKeyPrefix         = "transactions_paged:"
	TransactionTemplateCacheKeyPrefix       = "transaction_template:"
	TransactionTemplatesPagedCacheKeyPrefix = "transaction_templates_paged:"
	TransactionTagCacheKeyPrefix            = "transaction_tag:"
	TransactionTagsPagedCacheKeyPrefix      = "transaction_tags_paged:"
	TransactionRelationCacheKeyPrefix       = "transaction_relation:"
	TransactionRelationsPagedCacheKeyPrefix = "transaction_relations_paged:"
	SummaryTransactionCacheKeyPrefix        = "summary_transaction:"
	SummaryAccountCacheKeyPrefix            = "summary_account:"
	SummaryCategoryCacheKeyPrefix           = "summary_category:"
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
