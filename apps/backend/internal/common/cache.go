package common

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
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

// FetchWithCache is a generic helper that fetches data with caching
// It attempts to retrieve cached data first, and on cache miss or error,
// it executes the fetcher function and caches the result
func FetchWithCache[T any](
	ctx context.Context,
	rdb *redis.Client,
	cacheKey string,
	ttl time.Duration,
	fetcher func(context.Context) (T, error),
) (T, error) {
	// Try to get from cache first
	cached, err := GetCache[T](ctx, rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	// Cache miss or error - fetch fresh data
	result, err := fetcher(ctx)
	if err != nil {
		var zero T
		return zero, err
	}

	// Cache the result
	SetCache(ctx, rdb, cacheKey, result, ttl)
	return result, nil
}

// BuildCacheKey creates a consistent cache key from variadic key parts, ID, and serialized params
func BuildCacheKey(id int64, params interface{}, parts ...string) string {
	data, _ := json.Marshal(params)
	key := ""
	for _, part := range parts {
		key += part
	}
	return key + ":" + fmt.Sprintf("%d", id) + ":" + string(data)
}
