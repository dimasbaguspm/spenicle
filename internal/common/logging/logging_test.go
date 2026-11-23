package logging_test

import (
	"context"
	"log/slog"
	"sync"
	"testing"

	"go.opentelemetry.io/otel/trace"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
)

const component = "worker"

type sink struct {
	mu       sync.Mutex
	records  []slog.Record
	attached [][]slog.Attr
}

func (s *sink) last() (slog.Record, []slog.Attr) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.records) == 0 {
		return slog.Record{}, nil
	}

	return s.records[len(s.records)-1], s.attached[len(s.attached)-1]
}

type handler struct {
	sink  *sink
	bound []slog.Attr
}

func (h *handler) Enabled(context.Context, slog.Level) bool { return true }

func (h *handler) Handle(_ context.Context, record slog.Record) error {
	h.sink.mu.Lock()
	defer h.sink.mu.Unlock()

	h.sink.records = append(h.sink.records, record.Clone())
	h.sink.attached = append(h.sink.attached, h.bound)

	return nil
}

func (h *handler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &handler{sink: h.sink, bound: append(h.bound, attrs...)}
}

func (h *handler) WithGroup(string) slog.Handler { return h }

func newLogger() (*logging.Logger, *sink) {
	capture := &sink{}

	return logging.From(slog.New(&handler{sink: capture}), component), capture
}

func fields(record slog.Record, attached []slog.Attr) map[string]string {
	out := make(map[string]string, record.NumAttrs()+len(attached))

	collect := func(attr slog.Attr) bool {
		out[attr.Key] = attr.Value.String()

		return true
	}

	for _, attr := range attached {
		collect(attr)
	}

	record.Attrs(collect)

	return out
}

func TestLevels(t *testing.T) {
	tests := []struct {
		name string
		emit func(*logging.Logger, context.Context, string, ...slog.Attr)
		want slog.Level
	}{
		{name: "debug", emit: (*logging.Logger).Debug, want: slog.LevelDebug},
		{name: "info", emit: (*logging.Logger).Info, want: slog.LevelInfo},
		{name: "warn", emit: (*logging.Logger).Warn, want: slog.LevelWarn},
		{name: "error", emit: (*logging.Logger).Error, want: slog.LevelError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx := context.Background()
			logger, capture := newLogger()

			test.emit(logger, ctx, "hello")

			record, attached := capture.last()
			if record.Level != test.want {
				t.Fatalf("level = %s, want %s", record.Level, test.want)
			}

			if record.Message != "hello" {
				t.Fatalf("message = %q, want %q", record.Message, "hello")
			}

			got := fields(record, attached)
			if got["component"] != component {
				t.Fatalf("component = %q, want %q", got["component"], component)
			}
		})
	}
}

func TestTraceFields(t *testing.T) {
	traced := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID:    trace.TraceID{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10},
		SpanID:     trace.SpanID{0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18},
		TraceFlags: trace.FlagsSampled,
	})

	tests := []struct {
		name   string
		span   bool
		want   map[string]string
		absent []string
	}{
		{
			name:   "no span",
			absent: []string{"trace_id", "span_id"},
			want:   map[string]string{"component": component},
		},
		{
			name: "valid span",
			span: true,
			want: map[string]string{
				"component": component,
				"trace_id":  traced.TraceID().String(),
				"span_id":   traced.SpanID().String(),
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx := context.Background()
			if test.span {
				ctx = trace.ContextWithSpanContext(ctx, traced)
			}

			logger, capture := newLogger()

			logger.Info(ctx, "hello")

			record, attached := capture.last()
			got := fields(record, attached)

			for key, want := range test.want {
				if got[key] != want {
					t.Fatalf("%s = %q, want %q", key, got[key], want)
				}
			}

			for _, key := range test.absent {
				if _, found := got[key]; found {
					t.Fatalf("%s must be absent, got %q", key, got[key])
				}
			}
		})
	}
}

func TestAttrs(t *testing.T) {
	tests := []struct {
		name string
		with []slog.Attr
		call []slog.Attr
		want map[string]string
	}{
		{
			name: "call attributes only",
			call: []slog.Attr{slog.String("ref", "abc"), slog.Int("rows", 3)},
			want: map[string]string{"ref": "abc", "rows": "3"},
		},
		{
			name: "with attributes only",
			with: []slog.Attr{slog.String("job", "exports")},
			want: map[string]string{"job": "exports"},
		},
		{
			name: "both reach the record",
			with: []slog.Attr{slog.String("job", "imports")},
			call: []slog.Attr{slog.String("outcome", "ok")},
			want: map[string]string{"job": "imports", "outcome": "ok", "component": component},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx := context.Background()
			logger, capture := newLogger()

			logger.With(test.with...).Warn(ctx, "hello", test.call...)

			record, attached := capture.last()
			got := fields(record, attached)

			for key, want := range test.want {
				if got[key] != want {
					t.Fatalf("%s = %q, want %q", key, got[key], want)
				}
			}
		})
	}
}
