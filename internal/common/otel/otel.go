// Package telemetry (internal/common/otel) wires OpenTelemetry. Absent an
// endpoint it stays a no-op, so development needs no collector.
//
// The package is named telemetry rather than otel because it imports the
// go.opentelemetry.io/otel packages, and a package that shadows the name of its
// own dependency is a papercut on every file that touches it.
package telemetry

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
)

// metricInterval is how often metrics are flushed to the collector.
const metricInterval = 15 * time.Second

// Config describes where telemetry goes.
type Config struct {
	ServiceName string
	// TracerName is how this process identifies itself in spans. Defaults to the
	// service name when empty.
	TracerName string
	Version    string
	// Endpoint is host:port, optionally with a scheme. Empty disables export.
	Endpoint string
}

// tracerName is the one tracer every layer reports under. Setup sets it once at
// boot from configuration; span names carry the layer instead
// ("Repository.Sqlite.InsertEntry"), so a trace reads like the call stack.
var tracerName = "spenicle" //nolint:gochecknoglobals // one process-wide name, written once by Setup

// StartSpan opens a named span. The name must be qualified with the layer that
// owns the work, e.g. "Module.Ledger.Post". Callers defer the returned end
// function; it never returns the span itself, so no interface leaks into a caller.
func StartSpan(ctx context.Context, name string) (context.Context, func()) {
	ctx, span := otel.Tracer(tracerName).Start(ctx, name)

	return ctx, func() { span.End() }
}

// Setup installs global tracer and meter providers. The returned function
// flushes and shuts them down.
func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	if cfg.TracerName != "" {
		tracerName = cfg.TracerName
	}

	noop := func(context.Context) error { return nil }
	if strings.TrimSpace(cfg.Endpoint) == "" {
		return noop, nil
	}

	endpoint, insecure := parseEndpoint(cfg.Endpoint)

	res, err := resource.New(ctx, resource.WithAttributes(
		attribute.String("service.name", cfg.ServiceName),
		attribute.String("service.version", cfg.Version),
	))
	if err != nil {
		return nil, fmt.Errorf("otel resource: %w", err)
	}

	traceOpts := []otlptracehttp.Option{otlptracehttp.WithEndpoint(endpoint)}
	metricOpts := []otlpmetrichttp.Option{otlpmetrichttp.WithEndpoint(endpoint)}

	if insecure {
		traceOpts = append(traceOpts, otlptracehttp.WithInsecure())
		metricOpts = append(metricOpts, otlpmetrichttp.WithInsecure())
	}

	traceExp, err := otlptracehttp.New(ctx, traceOpts...)
	if err != nil {
		return nil, fmt.Errorf("otlp trace exporter: %w", err)
	}

	metricExp, err := otlpmetrichttp.New(ctx, metricOpts...)
	if err != nil {
		return nil, fmt.Errorf("otlp metric exporter: %w", err)
	}

	tp := trace.NewTracerProvider(trace.WithBatcher(traceExp), trace.WithResource(res))
	mp := metric.NewMeterProvider(
		metric.WithResource(res),
		metric.WithReader(metric.NewPeriodicReader(metricExp, metric.WithInterval(metricInterval))),
	)

	otel.SetTracerProvider(tp)
	otel.SetMeterProvider(mp)

	return func(shutdownCtx context.Context) error {
		tpErr := tp.Shutdown(shutdownCtx)
		mpErr := mp.Shutdown(shutdownCtx)

		if tpErr != nil {
			return fmt.Errorf("shutdown traces: %w", tpErr)
		}

		if mpErr != nil {
			return fmt.Errorf("shutdown metrics: %w", mpErr)
		}

		return nil
	}, nil
}

func parseEndpoint(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)

	switch {
	case strings.HasPrefix(raw, "http://"):
		return strings.TrimPrefix(raw, "http://"), true
	case strings.HasPrefix(raw, "https://"):
		return strings.TrimPrefix(raw, "https://"), false
	default:
		// No scheme: assume a local collector, which is never TLS.
		return raw, true
	}
}
