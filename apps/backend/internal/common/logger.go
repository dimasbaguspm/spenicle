package common

import (
	"crypto/rand"
	"fmt"
	"log/slog"
)

func NewLogger(fields ...any) *slog.Logger {
	return slog.With(fields...)
}

func GenerateID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}
