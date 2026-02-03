package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/redis/go-redis/v9"
)

const (
	RateLimitRequests  = 100         // requests per window
	RateLimitWindow    = time.Minute // time window
	RateLimitKeyPrefix = "rate_limit:"
)

type RateLimiter struct {
	rdb *redis.Client
}

func NewRateLimiter(rdb *redis.Client) *RateLimiter {
	return &RateLimiter{rdb: rdb}
}

func (rl *RateLimiter) IsAllowed(ctx context.Context, key string) (bool, int, time.Duration, error) {
	now := time.Now()
	windowStart := now.Truncate(RateLimitWindow)

	redisKey := fmt.Sprintf("%s%s:%s", RateLimitKeyPrefix, key, windowStart.Format("2006-01-02T15:04"))

	count, err := rl.rdb.Incr(ctx, redisKey).Result()
	if err != nil {
		return false, 0, 0, err
	}

	if count == 1 {
		rl.rdb.Expire(ctx, redisKey, RateLimitWindow)
	}

	if count > RateLimitRequests {
		resetTime := windowStart.Add(RateLimitWindow)
		resetDuration := resetTime.Sub(now)
		return false, int(count), resetDuration, nil
	}

	resetTime := windowStart.Add(RateLimitWindow)
	resetDuration := resetTime.Sub(now)
	return true, int(count), resetDuration, nil
}

func RateLimitMiddleware(env configs.Environment, rdb *redis.Client) func(http.Handler) http.Handler {
	rl := NewRateLimiter(rdb)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// only apply rate limiting in production
			if env.AppStage != configs.AppStageProd {
				next.ServeHTTP(w, r)
				return
			}

			logger := observability.GetLogger(r.Context())

			clientIP := r.RemoteAddr

			// Check rate limit
			allowed, count, resetDuration, err := rl.IsAllowed(r.Context(), clientIP)
			if err != nil {
				logger.Error("rate_limit_check_failed", "error", err, "client_ip", clientIP)
				http.Error(w, "Rate limit check failed", http.StatusInternalServerError)
				return
			}

			if !allowed {
				logger.Warn("rate_limit_exceeded", "client_ip", clientIP, "count", count, "reset_in", resetDuration)
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", RateLimitRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", int(resetDuration.Seconds())))
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(resetDuration.Seconds())))
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", RateLimitRequests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", RateLimitRequests-count))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", int(resetDuration.Seconds())))

			logger.Debug("rate_limit_allowed", "client_ip", clientIP, "count", count)
			next.ServeHTTP(w, r)
		})
	}
}
