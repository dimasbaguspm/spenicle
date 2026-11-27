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
	"net"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

const (
	metricInterval    = 15 * time.Second
	defaultTracerName = "spenicle"
)

type Config struct {
	ServiceName string
	Version     string
	Endpoint    string
}

const defaultOTLPHTTPPort = "4318"

//nolint:gochecknoglobals // one process-wide identity, written once by the command before Setup
var identity = struct {
	tracerName string
	version    string
	component  string
}{tracerName: defaultTracerName}

func SetIdentity(serviceName, version, component string) {
	if name := strings.TrimSpace(serviceName); name != "" {
		identity.tracerName = name
	}

	identity.version = version
	identity.component = component
}

func CurrentComponent() string { return identity.component }

func StartSpan(ctx context.Context, name string) (context.Context, func()) {
	ctx, span := otel.Tracer(identity.tracerName).Start(ctx, name,
		oteltrace.WithAttributes(identityAttributes()...))

	return ctx, func() { span.End() }
}

func TraceID(ctx context.Context) string {
	span := oteltrace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return ""
	}

	return span.SpanContext().TraceID().String()
}

// Ref tags the current span with the ref the work is about. Spans may carry a
// ref; metrics never may.
func Ref(ctx context.Context, ref string) {
	oteltrace.SpanFromContext(ctx).SetAttributes(attribute.String(AttrRef, ref))
}

func identityAttributes() []attribute.KeyValue {
	attrs := make([]attribute.KeyValue, 0, 2)

	if identity.version != "" {
		attrs = append(attrs, attribute.String(AttrVersion, identity.version))
	}

	if identity.component != "" {
		attrs = append(attrs, attribute.String(AttrComponent, identity.component))
	}

	return attrs
}

func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	noop := func(context.Context) error { return nil }
	if strings.TrimSpace(cfg.Endpoint) == "" {
		return noop, nil
	}

	endpoint, insecure := ParseEndpoint(cfg.Endpoint)

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

	if runtimeErr := runtime.Start(); runtimeErr != nil {
		return nil, fmt.Errorf("otel runtime instrumentation: %w", runtimeErr)
	}

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

func ParseEndpoint(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)

	switch {
	case strings.HasPrefix(raw, "https://"):
		return hostPort(strings.TrimPrefix(raw, "https://")), false
	case strings.HasPrefix(raw, "http://"):
		return hostPort(strings.TrimPrefix(raw, "http://")), true
	default:
		return hostPort(raw), false
	}
}

func hostPort(raw string) string {
	host := raw
	if idx := strings.IndexByte(host, '/'); idx >= 0 {
		host = host[:idx]
	}

	if _, _, err := net.SplitHostPort(host); err != nil {
		return net.JoinHostPort(host, defaultOTLPHTTPPort)
	}

	return host
}
