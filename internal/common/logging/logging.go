// Package logging is the one context-aware logger. Every record names the
// component that wrote it and, when the context carries one, the trace and span
// it belongs to, so a log line is always joinable to its span.
//
// Levels are fixed: Debug for hot-loop detail, Info for branch outcomes and
// lifecycle, Warn for degraded-but-recovered, Error only when a request answers
// 5xx or work is dropped. There is no configuration knob on purpose.
package logging

import (
	"context"
	"log/slog"

	"go.opentelemetry.io/otel/trace"
)

const (
	keyComponent = "component"
	keyTraceID   = "trace_id"
	keySpanID    = "span_id"

	vectorSlack = 3
)

type Logger struct {
	log       *slog.Logger
	component string
}

func New(component string) *Logger {
	return From(slog.Default(), component)
}

func From(log *slog.Logger, component string) *Logger {
	if log == nil {
		log = slog.Default()
	}

	return &Logger{log: log, component: component}
}

func (l *Logger) With(attrs ...slog.Attr) *Logger {
	return &Logger{log: slog.New(l.log.Handler().WithAttrs(attrs)), component: l.component}
}

func (l *Logger) Debug(ctx context.Context, message string, attrs ...slog.Attr) {
	l.emit(ctx, slog.LevelDebug, message, attrs)
}

func (l *Logger) Info(ctx context.Context, message string, attrs ...slog.Attr) {
	l.emit(ctx, slog.LevelInfo, message, attrs)
}

func (l *Logger) Warn(ctx context.Context, message string, attrs ...slog.Attr) {
	l.emit(ctx, slog.LevelWarn, message, attrs)
}

func (l *Logger) Error(ctx context.Context, message string, attrs ...slog.Attr) {
	l.emit(ctx, slog.LevelError, message, attrs)
}

func (l *Logger) emit(ctx context.Context, level slog.Level, message string, attrs []slog.Attr) {
	//nolint:sloglint // the wrapper forwards the caller's message
	l.log.LogAttrs(ctx, level, message, l.fields(ctx, attrs)...)
}

func (l *Logger) fields(ctx context.Context, attrs []slog.Attr) []slog.Attr {
	fields := make([]slog.Attr, 0, len(attrs)+vectorSlack)
	fields = append(fields, slog.String(keyComponent, l.component))

	if span := trace.SpanContextFromContext(ctx); span.IsValid() {
		fields = append(fields,
			slog.String(keyTraceID, span.TraceID().String()),
			slog.String(keySpanID, span.SpanID().String()))
	}

	return append(fields, attrs...)
}
