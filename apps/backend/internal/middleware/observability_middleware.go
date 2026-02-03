package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(data []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	return rw.ResponseWriter.Write(data)
}

func ObservabilityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := common.GenerateID()

		ctx := context.WithValue(r.Context(), observability.RequestIDKey, requestID)
		r = r.WithContext(ctx)

		rw := &responseWriter{ResponseWriter: w, statusCode: 0}

		start := time.Now()

		slog.Info("Incoming request",
			"request_id", requestID,
			"method", r.Method,
			"url", r.URL.String(),
			"remote_addr", r.RemoteAddr,
		)
		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		observability.RequestsTotal.WithLabelValues(r.Method, strconv.Itoa(rw.statusCode), r.URL.Path).Inc()
		observability.RequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration.Seconds())
		observability.LastRequestTime.WithLabelValues(r.Method, r.URL.Path).Set(float64(time.Now().Unix()))

		slog.Info("Request completed",
			"request_id", requestID,
			"duration_ms", duration.Milliseconds(),
			"status", rw.statusCode,
		)
	})
}
