package common

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/redis/go-redis/v9"
)

// GeoIndexConfig holds configuration for GeoIndexManager
type GeoIndexConfig struct {
	Key   string        // Redis key name (e.g., "transactions:geo")
	TTL   time.Duration // Time to live for entries
	Label string        // Label for observability
}

// GeoIndexManager manages geographic spatial indexing using Redis Geo
type GeoIndexManager struct {
	rdb    *redis.Client
	config GeoIndexConfig
}

// NewGeoIndexManager creates a new GeoIndexManager instance
func NewGeoIndexManager(rdb *redis.Client, config GeoIndexConfig) *GeoIndexManager {
	return &GeoIndexManager{rdb, config}
}

// retryWithBackoff executes operation with exponential backoff (100ms, 200ms, 400ms)
// Returns nil on success, logs and returns error after all retries exhausted
func (gim *GeoIndexManager) retryWithBackoff(ctx context.Context, operation func() error, action string, memberID int64) error {
	backoffs := []time.Duration{100 * time.Millisecond, 200 * time.Millisecond, 400 * time.Millisecond}

	for attempt, backoff := range backoffs {
		ctxWithTimeout, cancel := context.WithTimeout(ctx, 5*time.Second)
		err := operation()
		cancel()

		if err == nil {
			return nil
		}

		if attempt < len(backoffs)-1 && ctxWithTimeout.Err() == nil {
			time.Sleep(backoff)
		}
	}

	observability.NewLogger("common", "GeoIndexManager").Warn(action+" failed after retries", "memberID", memberID)
	return fmt.Errorf("%s failed for member %d", action, memberID)
}

// Index adds a geolocation entry with exponential backoff retry
func (gim *GeoIndexManager) Index(ctx context.Context, memberID int64, latitude, longitude float64) error {
	return gim.retryWithBackoff(ctx, func() error {
		return gim.rdb.GeoAdd(ctx, gim.config.Key, &redis.GeoLocation{
			Name:      fmt.Sprintf("%d", memberID),
			Longitude: longitude,
			Latitude:  latitude,
		}).Err()
	}, "index", memberID)
}

// Update updates a geolocation entry by removing and re-adding
func (gim *GeoIndexManager) Update(ctx context.Context, memberID int64, latitude, longitude float64) error {
	memberStr := fmt.Sprintf("%d", memberID)
	return gim.retryWithBackoff(ctx, func() error {
		gim.rdb.ZRem(ctx, gim.config.Key, memberStr)
		return gim.rdb.GeoAdd(ctx, gim.config.Key, &redis.GeoLocation{
			Name:      memberStr,
			Longitude: longitude,
			Latitude:  latitude,
		}).Err()
	}, "update", memberID)
}

// Remove deletes a geolocation entry (idempotent)
func (gim *GeoIndexManager) Remove(ctx context.Context, memberID int64) error {
	return gim.retryWithBackoff(ctx, func() error {
		err := gim.rdb.ZRem(ctx, gim.config.Key, fmt.Sprintf("%d", memberID)).Err()
		if err == redis.Nil {
			return nil
		}
		return err
	}, "remove", memberID)
}

// Search queries the geospatial index for members within radius
// radiusMeters is converted to kilometers
func (gim *GeoIndexManager) Search(ctx context.Context, longitude, latitude float64, radiusMeters int) ([]int64, error) {
	results, err := gim.rdb.GeoRadius(ctx, gim.config.Key, longitude, latitude, &redis.GeoRadiusQuery{
		Radius: float64(radiusMeters) / 1000.0,
		Unit:   "km",
	}).Result()

	if err != nil && err != redis.Nil {
		observability.NewLogger("common", "GeoIndexManager").Warn("search failed", "error", err)
		return nil, err
	}

	var memberIDs []int64
	for _, location := range results {
		var id int64
		if _, err := fmt.Sscanf(location.Name, "%d", &id); err == nil {
			memberIDs = append(memberIDs, id)
		}
	}
	return memberIDs, nil
}
