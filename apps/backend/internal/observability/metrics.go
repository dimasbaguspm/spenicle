package observability

import (
	"context"
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

var (
	// HTTP metrics
	RequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "status", "endpoint"},
	)

	RequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	LastRequestTime = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "http_last_request_timestamp",
			Help: "Timestamp of the last HTTP request per endpoint",
		},
		[]string{"method", "endpoint"},
	)

	// Worker metrics
	BudgetTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_budget_templates_processed_total",
			Help: "Total number of budget templates processed successfully",
		},
	)

	BudgetTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_budget_templates_failed_total",
			Help: "Total number of budget templates that failed processing",
		},
	)

	BudgetWorkerLastRun = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "worker_budget_templates_last_run_timestamp",
			Help: "Timestamp of the last budget template worker run",
		},
	)

	TransactionTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_transaction_templates_processed_total",
			Help: "Total number of transaction templates processed successfully",
		},
	)

	TransactionTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_transaction_templates_failed_total",
			Help: "Total number of transaction templates that failed processing",
		},
	)

	TransactionWorkerLastRun = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "worker_transaction_templates_last_run_timestamp",
			Help: "Timestamp of the last transaction template worker run",
		},
	)

	// Cache metrics
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"resource"},
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"resource"},
	)
)

// GetRequestID retrieves the request ID from the context
func GetRequestID(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return requestID
	}
	return "unknown"
}

// GetLogger returns a logger with the request ID from the context
func GetLogger(ctx context.Context) *slog.Logger {
	requestID := GetRequestID(ctx)
	return NewLogger("request_id", requestID)
}
