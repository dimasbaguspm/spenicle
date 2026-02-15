package middleware

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/observability"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func ObservabilityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := observability.GenerateID()

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		start := time.Now()

		slog.Info("request", "id", requestID, "method", r.Method, "path", r.URL.Path)

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		observability.HTTPRequestsTotal.WithLabelValues(
			r.Method,
			strconv.Itoa(rw.statusCode),
			r.URL.Path,
		).Inc()
		observability.HTTPRequestDuration.WithLabelValues(
			r.Method,
			r.URL.Path,
		).Observe(duration.Seconds())

		slog.Info("response",
			"id", requestID,
			"status", rw.statusCode,
			"ms", duration.Milliseconds(),
		)
	})
}
