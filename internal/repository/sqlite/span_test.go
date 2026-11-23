package sqlite_test

import (
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestSpansAreNamed(t *testing.T) {
	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))

	previous := otel.GetTracerProvider()

	otel.SetTracerProvider(provider)
	t.Cleanup(func() { otel.SetTracerProvider(previous) })

	store := newStore(t)

	if _, err := store.SchemaVersion(t.Context()); err != nil {
		t.Fatalf("schema version: %v", err)
	}

	want := "Repository.Sqlite.SchemaVersion"

	for _, ended := range recorder.Ended() {
		if ended.Name() == want {
			return
		}
	}

	t.Fatalf("no span named %q recorded (%d spans)", want, len(recorder.Ended()))
}
