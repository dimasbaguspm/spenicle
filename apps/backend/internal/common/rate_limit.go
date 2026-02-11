package common

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/redis/go-redis/v9"
)

// BuildRateLimitWindowKey constructs a rate limit window counter key
// Format: "rate_limit:window:{ip}:{timestamp}"
// Used for sliding window counter tracking with minute-level granularity
func BuildRateLimitWindowKey(ip string, windowStart time.Time) string {
	return fmt.Sprintf("%s%s:%s:%s",
		constants.RateLimitKeyPrefix,
		constants.RateLimitWindowLabel,
		ip,
		windowStart.Format("2006-01-02T15:04"))
}

// BuildRateLimitMetadataKey constructs a rate limit metadata storage key
// Format: "rate_limit:metadata:{ip}"
// Used for storing comprehensive request tracking data
func BuildRateLimitMetadataKey(ip string) string {
	return fmt.Sprintf("%s%s:%s",
		constants.RateLimitKeyPrefix,
		constants.RateLimitMetadataLabel,
		ip)
}

// BuildRateLimitWindowPattern returns wildcard pattern for all window keys
// Used for bulk deletion of window counters
func BuildRateLimitWindowPattern() string {
	return constants.RateLimitKeyPrefix + constants.RateLimitWindowLabel + ":*"
}

// BuildRateLimitMetadataPattern returns wildcard pattern for all metadata keys
// Used for bulk deletion of metadata
func BuildRateLimitMetadataPattern() string {
	return constants.RateLimitKeyPrefix + constants.RateLimitMetadataLabel + ":*"
}

// RateLimitMetadata stores comprehensive request tracking data
type RateLimitMetadata struct {
	IP                 string     `json:"ip"`
	FirstSeenAt        time.Time  `json:"firstSeenAt"`
	LastAccessAt       time.Time  `json:"lastAccessAt"`
	TotalRequests      int64      `json:"totalRequests"`
	TodayRequests      int64      `json:"todayRequests"`
	CurrentWindowCount int        `json:"currentWindowCount"`
	WindowStartTime    time.Time  `json:"windowStartTime"`
	IsBlocked          bool       `json:"isBlocked"`
	BlockCount         int64      `json:"blockCount"`
	LastBlockedAt      *time.Time `json:"lastBlockedAt,omitempty"`
}

// RateLimitManager encapsulates rate limiting logic
type RateLimitManager struct {
	rdb *redis.Client
}

// NewRateLimitManager creates a new rate limit manager
func NewRateLimitManager(rdb *redis.Client) *RateLimitManager {
	return &RateLimitManager{rdb: rdb}
}

// IsAllowed checks rate limit and returns metadata
func (m *RateLimitManager) IsAllowed(ctx context.Context, ip string) (bool, RateLimitMetadata, int, time.Duration, error) {
	now := time.Now().UTC()
	windowStart := now.Truncate(constants.RateLimitWindow)

	// Check window counter
	windowKey := BuildRateLimitWindowKey(ip, windowStart)
	count, err := m.rdb.Incr(ctx, windowKey).Result()
	if err != nil {
		observability.RateLimitMetadataLookups.WithLabelValues("error").Inc()
		return false, RateLimitMetadata{}, 0, 0, fmt.Errorf("redis incr failed: %w", err)
	}

	// Set TTL on first request in window
	if count == 1 {
		m.rdb.Expire(ctx, windowKey, constants.RateLimitWindow)
	}

	// Calculate reset time
	resetTime := windowStart.Add(constants.RateLimitWindow)
	resetDuration := resetTime.Sub(now)

	// Determine if blocked
	allowed := count <= constants.RateLimitRequests

	// Get existing metadata (non-blocking)
	metadata, err := m.getMetadata(ctx, ip)
	if err != nil && err != redis.Nil {
		observability.RateLimitMetadataLookups.WithLabelValues("error").Inc()
	} else if err == redis.Nil {
		observability.RateLimitMetadataLookups.WithLabelValues("miss").Inc()
		// First time seeing this IP
		metadata = RateLimitMetadata{
			IP:          ip,
			FirstSeenAt: now,
		}
	} else {
		observability.RateLimitMetadataLookups.WithLabelValues("hit").Inc()
	}

	// Reset daily count if needed
	resetDailyCountIfNeeded(&metadata, now)

	// Update metadata
	metadata.LastAccessAt = now
	metadata.TotalRequests++
	metadata.TodayRequests++
	metadata.CurrentWindowCount = int(count)
	metadata.WindowStartTime = windowStart
	metadata.IsBlocked = !allowed

	if !allowed {
		metadata.BlockCount++
		metadata.LastBlockedAt = &now
		observability.RateLimitRequestsTotal.WithLabelValues("blocked").Inc()
		observability.RateLimitBlockedIPs.WithLabelValues(ip).Inc()
	} else {
		observability.RateLimitRequestsTotal.WithLabelValues("allowed").Inc()
	}

	// Save metadata asynchronously (non-blocking)
	go func() {
		saveCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := m.setMetadata(saveCtx, metadata); err != nil {
			// Log error but don't block request
			observability.GetLogger(saveCtx).Error("failed_to_save_rate_limit_metadata",
				"error", err,
				"ip", ip)
		}
	}()

	return allowed, metadata, int(count), resetDuration, nil
}

// ClearAllRateLimitData removes all rate limit keys from Redis (called on app startup)
func (m *RateLimitManager) ClearAllRateLimitData(ctx context.Context) error {
	windowKeys, err := m.rdb.Keys(ctx, BuildRateLimitWindowPattern()).Result()
	if err != nil {
		return fmt.Errorf("failed to get window keys: %w", err)
	}

	metadataKeys, err := m.rdb.Keys(ctx, BuildRateLimitMetadataPattern()).Result()
	if err != nil {
		return fmt.Errorf("failed to get metadata keys: %w", err)
	}

	allKeys := append(windowKeys, metadataKeys...)
	if len(allKeys) > 0 {
		if err := m.rdb.Del(ctx, allKeys...).Err(); err != nil {
			return fmt.Errorf("failed to delete keys: %w", err)
		}
	}

	return nil
}

// getMetadata retrieves metadata from Redis
func (m *RateLimitManager) getMetadata(ctx context.Context, ip string) (RateLimitMetadata, error) {
	key := BuildRateLimitMetadataKey(ip)

	data, err := m.rdb.Get(ctx, key).Result()
	if err != nil {
		return RateLimitMetadata{}, err
	}

	var metadata RateLimitMetadata
	if err := json.Unmarshal([]byte(data), &metadata); err != nil {
		return RateLimitMetadata{}, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return metadata, nil
}

// setMetadata stores metadata in Redis with 24-hour TTL
func (m *RateLimitManager) setMetadata(ctx context.Context, metadata RateLimitMetadata) error {
	key := BuildRateLimitMetadataKey(metadata.IP)

	data, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	if err := m.rdb.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
		return fmt.Errorf("failed to set metadata: %w", err)
	}

	return nil
}

// resetDailyCountIfNeeded resets today's request count if date has changed
func resetDailyCountIfNeeded(metadata *RateLimitMetadata, now time.Time) {
	lastAccessDate := metadata.LastAccessAt.Truncate(24 * time.Hour)
	todayDate := now.Truncate(24 * time.Hour)

	if !lastAccessDate.Equal(todayDate) {
		metadata.TodayRequests = 0
	}
}

// Context keys and accessors
type rateLimitContextKey string

const RateLimitMetadataKey rateLimitContextKey = "rate_limit_metadata"

// GetRateLimitMetadata retrieves rate limit metadata from context
func GetRateLimitMetadata(ctx context.Context) *RateLimitMetadata {
	if metadata, ok := ctx.Value(RateLimitMetadataKey).(RateLimitMetadata); ok {
		return &metadata
	}
	return nil
}

// GetClientIP retrieves client IP from rate limit metadata in context
func GetClientIP(ctx context.Context) string {
	if metadata := GetRateLimitMetadata(ctx); metadata != nil {
		return metadata.IP
	}
	return "unknown"
}

// QueryMetadataForIP queries rate limit metadata for a specific IP
// Can be used anywhere with Redis client (no service layer needed)
func QueryMetadataForIP(ctx context.Context, rdb *redis.Client, ip string) (*RateLimitMetadata, error) {
	key := BuildRateLimitMetadataKey(ip)

	data, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil // IP not found
	}
	if err != nil {
		return nil, fmt.Errorf("redis get failed: %w", err)
	}

	var metadata RateLimitMetadata
	if err := json.Unmarshal([]byte(data), &metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal: %w", err)
	}

	return &metadata, nil
}

// FormatLastAccess formats the last access time in a human-readable format
func FormatLastAccess(lastAccess time.Time) string {
	duration := time.Since(lastAccess)

	if duration < time.Minute {
		return "just now"
	}
	if duration < time.Hour {
		mins := int(duration.Minutes())
		if mins == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", mins)
	}
	if duration < 24*time.Hour {
		hours := int(duration.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	}
	days := int(duration.Hours() / 24)
	if days == 1 {
		return "1 day ago"
	}
	return fmt.Sprintf("%d days ago", days)
}
