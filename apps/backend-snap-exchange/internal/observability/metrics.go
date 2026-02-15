package observability

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	ScrapesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "snapexchange_scrapes_total",
			Help: "Total ECB scrape attempts",
		},
	)

	ScrapesFailedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "snapexchange_scrapes_failed_total",
			Help: "Total failed scrape attempts",
		},
	)

	LastScrapeTimestamp = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "snapexchange_last_scrape_timestamp",
			Help: "Unix timestamp of last successful scrape",
		},
	)

	RatesCount = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "snapexchange_rates_count",
			Help: "Number of currency rates currently stored",
		},
	)

	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snapexchange_http_requests_total",
			Help: "Total HTTP requests by method, status, endpoint",
		},
		[]string{"method", "status", "endpoint"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "snapexchange_http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: []float64{0.0001, 0.0005, 0.001, 0.005, 0.01},
		},
		[]string{"method", "endpoint"},
	)
)
