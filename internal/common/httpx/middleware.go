package httpx

import (
	"log/slog"
	"net/http"
	"time"

	"go.opentelemetry.io/otel/codes"
	oteltrace "go.opentelemetry.io/otel/trace"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

func Recover(logger *logging.Logger) Middleware {
	//nolint:contextcheck // the panic guard calls no downstream function to inherit a context into
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.Error(r.Context(), "panic",
						slog.Any("value", recovered),
						slog.String("path", r.URL.Path))
					WriteError(w, http.StatusInternalServerError, "internal_error", "unexpected failure")
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// Observe is the one place a request becomes a span and a metric. The route is
// the router's pattern, never the raw path: a ref in an attribute is a defect.
func Observe(routeOf func(*http.Request) string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			route := routeOf(r)

			ctx, endSpan := telemetry.StartSpan(r.Context(), r.Method+" "+route)
			defer endSpan()

			telemetry.AddHTTPInFlight(ctx, r.Method, route, 1)

			defer telemetry.AddHTTPInFlight(ctx, r.Method, route, -1)

			recorder := &Recorder{ResponseWriter: w}
			start := time.Now()

			next.ServeHTTP(recorder, r.WithContext(ctx))

			status := recorder.Status
			if status == 0 {
				status = http.StatusOK
			}

			telemetry.RecordHTTPRequest(ctx, r.Method, route, status, time.Since(start))

			span := oteltrace.SpanFromContext(ctx)
			span.SetAttributes(telemetry.HTTPAttributes(r.Method, route, status)...)

			if status >= http.StatusInternalServerError {
				span.SetStatus(codes.Error, http.StatusText(status))
			}
		})
	}
}

func Log(logger *logging.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			recorder := &Recorder{ResponseWriter: w}

			next.ServeHTTP(recorder, r)

			logger.Info(r.Context(), "http",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", recorder.Status),
				slog.Int("bytes", recorder.Bytes),
				slog.Int64("duration_ms", time.Since(start).Milliseconds()))
		})
	}
}
