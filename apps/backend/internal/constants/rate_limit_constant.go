package constants

import "time"

const (
	// Entity identifier for rate limiting
	EntityRateLimit = "ratelimit"

	// Key components
	RateLimitKeyPrefix     = "rate_limit:"
	RateLimitWindowLabel   = "window"
	RateLimitMetadataLabel = "metadata"

	// Rate limit configuration
	RateLimitRequests = 100
	RateLimitWindow   = time.Minute
)

// RateLimitCachePatterns defines wildcard patterns for bulk operations
// Used by ClearAllRateLimitData() for startup cleanup
var RateLimitCachePatterns = map[string][]string{
	EntityRateLimit: {
		"rate_limit:window:*",
		"rate_limit:metadata:*",
	},
}
