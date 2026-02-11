package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
)

func RateLimitMiddleware(env configs.Environment, rateLimitMgr *common.RateLimitManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// only apply rate limiting in production
			if env.AppStage != configs.AppStageProd {
				next.ServeHTTP(w, r)
				return
			}

			logger := observability.GetLogger(r.Context())
			clientIP := r.RemoteAddr

			// Check rate limit using common module
			allowed, metadata, count, resetDuration, err := rateLimitMgr.IsAllowed(r.Context(), clientIP)
			if err != nil {
				logger.Error("rate_limit_check_failed", "error", err, "client_ip", clientIP)
				http.Error(w, "Rate limit check failed", http.StatusInternalServerError)
				return
			}

			// Add metadata to context for downstream use
			ctx := context.WithValue(r.Context(), common.RateLimitMetadataKey, metadata)
			r = r.WithContext(ctx)

			// Handle blocked request
			if !allowed {
				logger.Warn("rate_limit_exceeded",
					"client_ip", clientIP,
					"count", count,
					"reset_in", resetDuration,
					"total_requests", metadata.TotalRequests,
					"block_count", metadata.BlockCount)

				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", constants.RateLimitRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", int(resetDuration.Seconds())))
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(resetDuration.Seconds())))
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", constants.RateLimitRequests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", constants.RateLimitRequests-count))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", int(resetDuration.Seconds())))

			logger.Debug("rate_limit_allowed",
				"client_ip", clientIP,
				"count", count,
				"total_requests", metadata.TotalRequests,
				"today_requests", metadata.TodayRequests)

			next.ServeHTTP(w, r)
		})
	}
}
