// Package middlewares holds the HTTP layers that wrap every route: recovery,
// tracing and structured request logging. They know nothing about the ledger, so
// they would wrap any handler this process ever serves.
package middlewares

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

func Chain(handler http.Handler, layers ...httpx.Middleware) http.Handler {
	return httpx.Chain(handler, layers...)
}

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

func CORS(allowedOrigin string) httpx.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Add("Vary", "Origin")

			origin := r.Header.Get("Origin")
			if allowedOrigin != "" && strings.EqualFold(origin, allowedOrigin) {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.Header().Set("Access-Control-Max-Age", "600")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)

				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
