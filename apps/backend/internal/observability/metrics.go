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
			Name: "spenicle_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "status", "endpoint"},
	)

	RequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "spenicle_http_request_duration_seconds",
			Help: "HTTP request duration in seconds with latency buckets (50ms, 100ms, 250ms, 500ms)",
			// Custom buckets: 50ms, 100ms, 250ms, 500ms, and default upper bounds
			Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2, 5},
		},
		[]string{"method", "endpoint"},
	)

	LastRequestTime = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "spenicle_http_last_request_timestamp",
			Help: "Timestamp of the last HTTP request per endpoint",
		},
		[]string{"method", "endpoint"},
	)

	HTTPErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_http_errors_total",
			Help: "Total number of HTTP errors by status code",
		},
		[]string{"status_code", "method", "endpoint"},
	)

	ErrorRateByType = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_errors_total",
			Help: "Total number of errors by error type",
		},
		[]string{"error_type"},
	)

	// Worker metrics
	BudgetTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_budget_templates_processed_total",
			Help: "Total number of budget templates processed successfully",
		},
	)

	BudgetTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_budget_templates_failed_total",
			Help: "Total number of budget templates that failed processing",
		},
	)

	BudgetWorkerLastRun = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "spenicle_worker_budget_templates_last_run_timestamp",
			Help: "Timestamp of the last budget template worker run",
		},
	)

	TransactionTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_transaction_templates_processed_total",
			Help: "Total number of transaction templates processed successfully",
		},
	)

	TransactionTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_transaction_templates_failed_total",
			Help: "Total number of transaction templates that failed processing",
		},
	)

	TransactionWorkerLastRun = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "spenicle_worker_transaction_templates_last_run_timestamp",
			Help: "Timestamp of the last transaction template worker run",
		},
	)

	// Cache metrics
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"resource"},
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"resource"},
	)

	// Database metrics
	QueryExecutionTime = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "spenicle_db_query_duration_seconds",
			Help:    "Database query execution time in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
		},
		[]string{"query_type", "table"},
	)
)

// RecordHTTPError records an HTTP error metric
func RecordHTTPError(statusCode, method, endpoint string) {
	HTTPErrorsTotal.WithLabelValues(statusCode, method, endpoint).Inc()
}

// RecordError records an error by type
func RecordError(errorType string) {
	ErrorRateByType.WithLabelValues(errorType).Inc()
}

// RecordQueryDuration records database query execution time
func RecordQueryDuration(queryType, table string, duration float64) {
	QueryExecutionTime.WithLabelValues(queryType, table).Observe(duration)
}

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
