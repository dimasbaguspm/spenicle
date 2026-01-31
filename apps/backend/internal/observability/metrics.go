package observability

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

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
)
