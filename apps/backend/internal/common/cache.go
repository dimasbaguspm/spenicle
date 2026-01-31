package common

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache key prefixes for consistency across services
const (
	AccountCacheKeyPrefix                   = "account:"
	AccountsPagedCacheKeyPrefix             = "accounts_paged:"
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

func SetCache[T any](ctx context.Context, rdb *redis.Client, key string, value T, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return rdb.Set(ctx, key, data, ttl).Err()
}

func GetCache[T any](ctx context.Context, rdb *redis.Client, key string) (T, error) {
	var zero T
	data, err := rdb.Get(ctx, key).Result()
	if err != nil {
		return zero, err
	}
	var value T
	err = json.Unmarshal([]byte(data), &value)
	return value, err
}

func InvalidateCache(ctx context.Context, rdb *redis.Client, pattern string) error {
	keys, err := rdb.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}
	if len(keys) > 0 {
		return rdb.Del(ctx, keys...).Err()
	}
	return nil
}
