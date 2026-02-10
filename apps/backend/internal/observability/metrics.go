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
	// HTTP metrics - used for: Status Pie/Gauge panels, Latency Line/Heatmap panels, Error Bar charts
	RequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_http_requests_total",
			Help: "Total number of HTTP requests (Panel: Bar/Line chart for requests over time)",
		},
		[]string{"method", "status", "endpoint"},
	)

	RequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "spenicle_http_request_duration_seconds",
			Help: "HTTP request duration in seconds (Panel: Heatmap for latency distribution, p95/p99 line charts)",
			// Custom buckets: 50ms, 100ms, 250ms, 500ms, and default upper bounds
			Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2, 5},
		},
		[]string{"method", "endpoint"},
	)

	HTTPErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_http_errors_total",
			Help: "Total number of HTTP errors by status code (Panel: Bar chart showing error distribution by status)",
		},
		[]string{"status_code", "method", "endpoint"},
	)

	ErrorRateByType = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_errors_total",
			Help: "Total number of errors by error type (Panel: Pie chart for error type distribution)",
		},
		[]string{"error_type"},
	)

	// Service operation metrics - track which services/resources are accessed and how
	ServiceOperations = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_service_operations_total",
			Help: "Total operations by service/resource and HTTP method (Panel: Stacked bar for service usage breakdown, Pie chart for method distribution)",
		},
		[]string{"service", "method"},
	)

	ServiceOperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "spenicle_service_operation_duration_seconds",
			Help:    "Service operation duration by service and method (Panel: Box plot or Heatmap showing latency by service, useful for identifying slow services)",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5},
		},
		[]string{"service", "method"},
	)

	// Worker metrics - used for: Counter panels showing throughput, success/failure rates
	BudgetTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_budget_templates_processed_total",
			Help: "Total number of budget templates processed successfully (Panel: Stat card showing total count)",
		},
	)

	BudgetTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_budget_templates_failed_total",
			Help: "Total number of budget templates that failed processing (Panel: Stat card with error threshold alert)",
		},
	)

	BudgetWorkerRuns = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_budget_templates_runs_total",
			Help: "Total number of budget template worker executions (Panel: Counter showing worker activity)",
		},
	)

	TransactionTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_transaction_templates_processed_total",
			Help: "Total number of transaction templates processed successfully (Panel: Stat card showing throughput)",
		},
	)

	TransactionTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_transaction_templates_failed_total",
			Help: "Total number of transaction templates that failed processing (Panel: Stat card with error threshold)",
		},
	)

	TransactionWorkerRuns = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_transaction_templates_runs_total",
			Help: "Total number of transaction template worker executions (Panel: Counter showing execution frequency)",
		},
	)

	GeoIndexRepopulated = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_geo_index_repopulated_total",
			Help: "Total number of transactions indexed in geo cache (Panel: Stat card showing repopulation throughput)",
		},
	)

	GeoIndexWorkerRuns = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spenicle_worker_geo_index_runs_total",
			Help: "Total number of geo index worker executions (Panel: Counter showing worker activity)",
		},
	)

	// Cache metrics - used for: Hit rate line charts, TTL distribution pie charts, Key count gauge
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_cache_hits_total",
			Help: "Total number of cache hits (Panel: Line chart to calculate hit rate % via Prometheus query)",
		},
		[]string{"resource"},
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_cache_misses_total",
			Help: "Total number of cache misses (Panel: Line chart; use hits/(hits+misses) for hit rate %)",
		},
		[]string{"resource"},
	)

	CacheInvalidationSkipped = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spenicle_cache_invalidation_skipped_total",
			Help: "Total cache invalidation patterns skipped due to missing parameters (Panel: Alert if > 0)",
		},
		[]string{"entity", "pattern"},
	)

	// Database metrics - used for: Query latency heatmaps, Percentile line charts
	QueryExecutionTime = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "spenicle_db_query_duration_seconds",
			Help:    "Database query execution time in seconds (Panel: Heatmap for latency distribution, p95/p99 lines)",
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

// RecordServiceOperation records a service operation with duration
func RecordServiceOperation(service, method string, duration float64) {
	ServiceOperations.WithLabelValues(service, method).Inc()
	ServiceOperationDuration.WithLabelValues(service, method).Observe(duration)
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
