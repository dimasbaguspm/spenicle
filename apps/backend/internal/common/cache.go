package common

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/redis/go-redis/v9"
)

func setCache[T any](ctx context.Context, rdb *redis.Client, key string, value T, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return rdb.Set(ctx, key, data, ttl).Err()
}

func getCache[T any](ctx context.Context, rdb *redis.Client, key string) (T, error) {
	var zero T
	data, err := rdb.Get(ctx, key).Result()
	if err != nil {
		return zero, err
	}
	var value T
	err = json.Unmarshal([]byte(data), &value)
	return value, err
}

// InvalidateCacheForEntity invalidates cache patterns for a given entity
// It resolves placeholders (e.g., {accountId}) using the provided params map
// and deletes all matching cache keys from Redis.
// Missing placeholders are silently skipped with observability metric emitted.
func InvalidateCacheForEntity(
	ctx context.Context,
	rdb *redis.Client,
	entity string,
	params map[string]interface{},
) error {
	patterns, exists := constants.EntityCachePatterns[entity]
	if !exists {
		return fmt.Errorf("entity '%s' not found in EntityCachePatterns", entity)
	}

	placeholderPattern := regexp.MustCompile(`\{([a-zA-Z]+)\}`)

	for _, pattern := range patterns {
		// Substitute placeholders with actual values from params
		resolvedPattern := pattern
		missingPlaceholder := false

		matches := placeholderPattern.FindAllStringSubmatchIndex(pattern, -1)
		// Process matches in reverse order to maintain indices
		for i := len(matches) - 1; i >= 0; i-- {
			match := matches[i]
			placeholderName := pattern[match[2]:match[3]] // Extract placeholder name without braces
			value, found := params[placeholderName]

			if !found {
				// Placeholder not found in params - skip this pattern and emit metric
				missingPlaceholder = true
				observability.CacheInvalidationSkipped.WithLabelValues(entity, pattern).Inc()
				break
			}

			// Substitute placeholder with value
			replacement := fmt.Sprintf("%v", value)
			resolvedPattern = resolvedPattern[:match[0]] + replacement + resolvedPattern[match[1]:]
		}

		// Skip pattern if it had missing placeholders
		if missingPlaceholder {
			continue
		}

		// Delete all keys matching the resolved pattern
		if err := deletePatternKeys(ctx, rdb, resolvedPattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern '%s' for entity '%s': %w", resolvedPattern, entity, err)
		}
	}

	return nil
}

// deletePatternKeys deletes all Redis keys matching a glob pattern
func deletePatternKeys(ctx context.Context, rdb *redis.Client, pattern string) error {
	keys, err := rdb.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}
	if len(keys) > 0 {
		return rdb.Del(ctx, keys...).Err()
	}
	return nil
}

// canonicalJSON marshals data with sorted keys for deterministic cache keys
// This ensures the same parameters always produce the same cache key
func canonicalJSON(data interface{}) (string, error) {
	// Marshal to JSON
	raw, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	// Unmarshal to map to normalize structure
	var obj map[string]interface{}
	if err := json.Unmarshal(raw, &obj); err != nil {
		// If not a map, return original marshalled form
		return string(raw), nil
	}

	// Re-marshal - Go's json.Marshal sorts map keys by default
	sorted, err := json.Marshal(obj)
	if err != nil {
		return "", err
	}
	return string(sorted), nil
}

// BuildDetailCacheKey constructs a detail cache key in the format "entity:detail:{id}"
// This matches the EntityCachePatterns format and is used by GetDetail methods
// Example: BuildDetailCacheKey("account", 123) → "account:detail:123"
func BuildDetailCacheKey(entity string, id int64) string {
	return fmt.Sprintf("%s:detail:%d", entity, id)
}

// BuildPagedCacheKey constructs a paged list cache key in the format "entity:paged:{hash}"
// This matches the EntityCachePatterns format and is used by GetPaged methods
// The hash is computed from search parameters to ensure unique keys for different queries
// Uses canonical JSON encoding to ensure deterministic cache keys
// Example: BuildPagedCacheKey("account", searchParams) → "account:paged:{json_hash}"
func BuildPagedCacheKey(entity string, searchParams interface{}) string {
	hash, err := canonicalJSON(searchParams)
	if err != nil {
		// Fallback to non-canonical if marshalling fails
		data, _ := json.Marshal(searchParams)
		hash = string(data)
	}
	return fmt.Sprintf("%s:paged:%s", entity, hash)
}

// BuildStatisticsCacheKey constructs a statistics cache key in format "entity:statistics:{id}:{type}:{hash}"
// This matches the EntityCachePatterns format and is used by statistics service methods
// Allows fine-grained cache invalidation by entity ID, statistic type, and parameters
// Uses canonical JSON encoding to ensure deterministic cache keys
// Example: BuildStatisticsCacheKey("account", 123, "category_heatmap", params) → "account:statistics:123:category_heatmap:{hash}"
func BuildStatisticsCacheKey(entity string, entityID int64, statisticType string, searchParams interface{}) string {
	hash, err := canonicalJSON(searchParams)
	if err != nil {
		// Fallback to non-canonical if marshalling fails
		data, _ := json.Marshal(searchParams)
		hash = string(data)
	}
	return fmt.Sprintf("%s:statistics:%d:%s:%s", entity, entityID, statisticType, hash)
}

// FetchWithCache is a generic helper that fetches data with caching
// It attempts to retrieve cached data first, and on cache miss or error,
// it executes the fetcher function and caches the result
// resourceLabel is optional and defaults to "unknown" if not provided
func FetchWithCache[T any](
	ctx context.Context,
	rdb *redis.Client,
	cacheKey string,
	ttl time.Duration,
	fetcher func(context.Context) (T, error),
	resourceLabel string,
) (T, error) {
	// Try to get from cache first
	cached, err := getCache[T](ctx, rdb, cacheKey)
	if err == nil {
		// Cache hit
		observability.CacheHits.WithLabelValues(resourceLabel).Inc()
		return cached, nil
	}

	// Cache miss - fetch fresh data
	observability.CacheMisses.WithLabelValues(resourceLabel).Inc()
	result, err := fetcher(ctx)
	if err != nil {
		var zero T
		return zero, err
	}

	// Cache the result
	setCache(ctx, rdb, cacheKey, result, ttl)
	return result, nil
}
