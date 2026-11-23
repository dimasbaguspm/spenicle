// Package otelx wires OpenTelemetry. Absent an endpoint it stays a no-op, so
// development needs no collector.
package otelx

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

// Config describes where telemetry goes.
type Config struct {
	ServiceName string
	Version     string
	// Endpoint is host:port, optionally with a scheme. Empty disables export.
	Endpoint string
}

// metricInterval is how often metrics are flushed to the collector.
const metricInterval = 15 * time.Second

// Setup installs global tracer and meter providers. The returned function
// flushes and shuts them down.
func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
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
