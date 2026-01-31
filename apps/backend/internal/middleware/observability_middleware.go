package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	requestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "status", "endpoint"},
	)

	requestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	lastRequestTime = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "http_last_request_timestamp",
			Help: "Timestamp of the last HTTP request per endpoint",
		},
		[]string{"method", "endpoint"},
	)
)

func extractEndpoint(path string) string {
	if path == "/metrics" {
		return "metrics"
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return "unknown"
}

type contextKey string

const RequestIDKey contextKey = "request_id"

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(data []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	return rw.ResponseWriter.Write(data)
}

func ObservabilityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := common.GenerateID()

		ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
		r = r.WithContext(ctx)

		rw := &responseWriter{ResponseWriter: w, statusCode: 0}

		start := time.Now()

		slog.Info("Incoming request",
			"request_id", requestID,
			"method", r.Method,
			"url", r.URL.String(),
			"remote_addr", r.RemoteAddr,
		)
		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		endpoint := extractEndpoint(r.URL.Path)
		requestsTotal.WithLabelValues(r.Method, strconv.Itoa(rw.statusCode), endpoint).Inc()
		requestDuration.WithLabelValues(r.Method, endpoint).Observe(duration.Seconds())
		lastRequestTime.WithLabelValues(r.Method, endpoint).Set(float64(time.Now().Unix()))

		slog.Info("Request completed",
			"request_id", requestID,
			"duration_ms", duration.Milliseconds(),
			"status", rw.statusCode,
		)
	})
}

func GetRequestID(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return requestID
	}
	return "unknown"
}

func GetLogger(ctx context.Context) *slog.Logger {
	requestID := GetRequestID(ctx)
	return common.NewLogger("request_id", requestID)
}
