package observability

import "log/slog"

func NewLogger(fields ...any) *slog.Logger {
	return slog.With(fields...)
}
