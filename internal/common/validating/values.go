package validating

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const (
	minutesLayout  = "2006-01-02T15:04"
	secondsLayout  = "2006-01-02T15:04:05"
	endOfDayHour   = 23
	endOfDayMinute = 59
)

var momentLayouts = []string{minutesLayout, secondsLayout} //nolint:gochecknoglobals // two layouts, read-only

// Money turns a raw minor-unit string into an integer. Every amount that crosses a
// boundary goes through here: the tags check the shape, this produces the value.
func Money(raw, name string) (int64, error) {
	trimmed := strings.TrimSpace(raw)

	parsed, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: %q is not a minor-unit integer", name, trimmed)
	}

	if parsed == math.MinInt64 {
		return 0, fmt.Errorf("%s: %q is not a representable minor-unit integer", name, trimmed)
	}

	return parsed, nil
}

// Day turns a raw calendar date into a time at midnight in the layout the ledger
// speaks; every date that crosses a boundary goes through here.
func Day(raw, name string) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)

	parsed, err := time.Parse(constant.DateLayout, trimmed)
	if err != nil {
		return time.Time{}, fmt.Errorf("%s: %q is not %s", name, trimmed, constant.DateLayout)
	}

	return parsed, nil
}

// Moment turns a raw date or date-time into the instant it names in loc: a bare date
// is the first second of that day, a date-time is itself, and an RFC3339 value keeps
// its own offset.
func Moment(raw, name string, loc *time.Location) (time.Time, error) {
	return parseMoment(raw, name, loc, false)
}

// MomentEnd is Moment for the upper bound of a range: a bare date covers the whole
// day, so it answers the last second of that day instead of its first.
func MomentEnd(raw, name string, loc *time.Location) (time.Time, error) {
	return parseMoment(raw, name, loc, true)
}

func parseMoment(raw, name string, loc *time.Location, end bool) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, fmt.Errorf("%s: an empty %s is not a moment", name, name)
	}

	if loc == nil {
		loc = time.UTC
	}

	if parsed, err := time.ParseInLocation(constant.DateLayout, trimmed, loc); err == nil {
		if end {
			return time.Date(parsed.Year(), parsed.Month(), parsed.Day(),
				endOfDayHour, endOfDayMinute, endOfDayMinute, 0, loc), nil
		}

		return parsed, nil
	}

	for _, layout := range momentLayouts {
		if parsed, err := time.ParseInLocation(layout, trimmed, loc); err == nil {
			return parsed, nil
		}
	}

	if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
		return parsed, nil
	}

	return time.Time{}, fmt.Errorf("%s: %q is not %s, %s, %s or %s", name, trimmed,
		constant.DateLayout, minutesLayout, secondsLayout, time.RFC3339)
}
