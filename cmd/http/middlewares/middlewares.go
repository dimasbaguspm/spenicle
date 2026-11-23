// Package middlewares holds the HTTP layers that wrap every route: recovery,
// tracing and structured request logging. They know nothing about the ledger, so
// they would wrap any handler this process ever serves.
package middlewares

import (
	"log/slog"
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

// Chain applies middleware so the first argument is the outermost layer.
func Chain(handler http.Handler, layers ...httpx.Middleware) http.Handler {
	return httpx.Chain(handler, layers...)
}

// Recover turns a panic into a 500 instead of a dropped connection.
func Recover(logger *slog.Logger) httpx.Middleware {
	//nolint:contextcheck // the panic guard calls no downstream function to inherit a context into
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.ErrorContext(r.Context(), "panic",
						slog.Any("value", recovered),
						slog.String("path", r.URL.Path))
					httpx.WriteError(w, http.StatusInternalServerError,
						"internal_error", "unexpected failure")
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// Observe starts one span per request and records the outcome on it.
func Observe() httpx.Middleware {
	tracer := otel.Tracer("spenicle/http")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, span := tracer.Start(r.Context(), r.Method+" "+r.URL.Path)
			defer span.End()

			recorder := &httpx.Recorder{ResponseWriter: w}
			next.ServeHTTP(recorder, r.WithContext(ctx))

			span.SetAttributes(
				attribute.String("http.request.method", r.Method),
				attribute.String("url.path", r.URL.Path),
				attribute.Int("http.response.status_code", recorder.Status),
			)

			if recorder.Status >= http.StatusInternalServerError {
				span.SetStatus(codes.Error, http.StatusText(recorder.Status))
			}
		})
	}
}

// Log writes one structured line per request.
func Log(logger *slog.Logger) httpx.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			recorder := &httpx.Recorder{ResponseWriter: w}

			next.ServeHTTP(recorder, r)

			logger.InfoContext(r.Context(), "http",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", recorder.Status),
				slog.Int("bytes", recorder.Bytes),
				slog.Int64("duration_ms", time.Since(start).Milliseconds()))
		})
	}
}
