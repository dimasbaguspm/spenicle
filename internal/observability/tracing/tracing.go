package tracing

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type ctxKey string

const (
	// TraceIDKey keeps backward compatibility for code that expects a string
	// Trace ID in the context.
	TraceIDKey ctxKey = "trace_id"
	// TraceInfoKey stores richer trace information for debugging.
	TraceInfoKey ctxKey = "trace_info"
)

// TraceInfo holds request-scoped tracing metadata useful for debugging.
type TraceInfo struct {
	TraceID   string    `json:"trace_id"`
	StartedAt time.Time `json:"started_at"`
}

// Middleware ensures every incoming request has a trace id. It will prefer
// an existing X-Trace-Id or X-Request-Id header, otherwise it generates one.
// It stores both a simple string value (for compatibility) and a richer
// TraceInfo struct in the request context so other packages (logger, tests,
// handlers) can access start time and id for debugging.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := r.Header.Get("X-Trace-Id")
		if traceID == "" {
			traceID = r.Header.Get("X-Request-Id")
		}
		if traceID == "" {
			traceID = uuid.NewString()
		}

		// expose trace id to responses
		w.Header().Set("X-Trace-Id", traceID)

		// populate richer trace info and keep the old string key for
		// backwards compatibility.
		ti := &TraceInfo{
			TraceID:   traceID,
			StartedAt: time.Now().UTC(),
		}
		ctx := context.WithValue(r.Context(), TraceInfoKey, ti)
		ctx = context.WithValue(ctx, TraceIDKey, traceID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// FromContext returns the trace id if present. It first checks the legacy
// string key, then the richer TraceInfo.
func FromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if v, ok := ctx.Value(TraceIDKey).(string); ok {
		return v
	}
	if ti, ok := ctx.Value(TraceInfoKey).(*TraceInfo); ok {
		return ti.TraceID
	}
	return ""
}

// TraceInfoFromContext returns the richer TraceInfo struct if present.
// Callers should not modify the returned struct.
func TraceInfoFromContext(ctx context.Context) *TraceInfo {
	if ctx == nil {
		return nil
	}
	if ti, ok := ctx.Value(TraceInfoKey).(*TraceInfo); ok {
		return ti
	}
	// fallback: if only string is present, fabricate a TraceInfo with no start
	if tid := FromContext(ctx); tid != "" {
		return &TraceInfo{TraceID: tid}
	}
	return nil
}
