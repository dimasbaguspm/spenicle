package validating

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

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
