package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// pathID reads the {id} segment of a route.
func pathID(r *http.Request) (int64, error) {
	raw := strings.TrimSpace(r.PathValue("id"))
	if raw == "" {
		return 0, errors.New("id is required")
	}

	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("id must be a positive integer, got %q", raw)
	}

	return id, nil
}

// intParam reads an optional integer query parameter, zero when absent.
func intParam(r *http.Request, name string) (int64, error) {
	return int64Param(r, name)
}

// int64Param parses a query parameter, treating empty as "not given".
func int64Param(r *http.Request, name string) (int64, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return 0, nil
	}

	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer, got %q", name, raw)
	}

	return value, nil
}

// dateParam reads an optional YYYY-MM-DD query parameter.
func dateParam(r *http.Request, name string) (time.Time, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return time.Time{}, nil
	}

	parsed, err := time.Parse(constant.DateLayout, raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("%s must be YYYY-MM-DD: %w", name, err)
	}

	return parsed, nil
}

// parseDate reads a required YYYY-MM-DD body field.
func parseDate(raw string) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, errors.New("occurred_on is required")
	}

	parsed, err := time.Parse(constant.DateLayout, trimmed)
	if err != nil {
		return time.Time{}, errors.New("occurred_on must be YYYY-MM-DD")
	}

	return parsed, nil
}
