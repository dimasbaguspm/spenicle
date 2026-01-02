package logger

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/observability/tracing"
)

func Log() *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	return slog.New(handler)
}

// LogWithContext returns a logger that includes the request trace id (if present)
// so logs emitted during request handling can be correlated.
func LogWithContext(ctx context.Context) *slog.Logger {
	base := Log()
	if ctx == nil {
		return base
	}
	tid := tracing.FromContext(ctx)
	if tid == "" {
		return base
	}

	if ti := tracing.TraceInfoFromContext(ctx); ti != nil && !ti.StartedAt.IsZero() {
		return base.With("trace_id", tid, "trace_started_at", ti.StartedAt.Format(time.RFC3339))
	}

	return base.With("trace_id", tid)
}
