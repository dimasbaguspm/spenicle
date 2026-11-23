package telemetry

import (
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

// RecordSpans installs an in-memory tracer provider and hands back the recorder,
// so a test can assert the span tree a request produced. It is a test hook and
// nothing else: the process installs its real provider in Setup.
func RecordSpans() *tracetest.SpanRecorder {
	recorder := tracetest.NewSpanRecorder()

	otel.SetTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)))

	return recorder
}
