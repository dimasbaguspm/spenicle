package validating_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/validating"
)

func TestMoney(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		raw     string
		want    int64
		wantErr bool
	}{
		{name: "a plain amount", raw: "1500", want: 1500},
		{name: "a padded amount", raw: " 1500 ", want: 1500},
		{name: "a negative amount", raw: "-18000", want: -18000},
		{name: "a decimal is refused", raw: "15.00", wantErr: true},
		{name: "a thousands separator is refused", raw: "1,500", wantErr: true},
		{name: "an empty value is refused", raw: "", wantErr: true},
		{name: "a value past the int64 ceiling is refused", raw: "9223372036854775808", wantErr: true},
		{name: "the int64 floor is refused", raw: "-9223372036854775808", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			got, err := validating.Money(test.raw, "amount")
			if test.wantErr {
				if err == nil {
					t.Fatalf("Money(%q) = %d, want an error", test.raw, got)
				}

				return
			}

			if err != nil {
				t.Fatalf("Money(%q) failed: %v", test.raw, err)
			}

			if got != test.want {
				t.Fatalf("Money(%q) = %d, want %d", test.raw, got, test.want)
			}
		})
	}
}

func TestDay(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		raw     string
		want    string
		wantErr bool
	}{
		{name: "a plain day", raw: "2026-02-14", want: "2026-02-14"},
		{name: "a padded day", raw: " 2026-02-14 ", want: "2026-02-14"},
		{name: "a leap day is a day", raw: "2024-02-29", want: "2024-02-29"},
		{name: "a timestamp is not a day", raw: "2026-02-14T09:00:00Z", wantErr: true},
		{name: "a swapped month and day is refused", raw: "2026-14-02", wantErr: true},
		{name: "a day that does not exist is refused", raw: "2026-02-30", wantErr: true},
		{name: "an empty value is refused", raw: "", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			got, err := validating.Day(test.raw, "from")
			if test.wantErr {
				if err == nil {
					t.Fatalf("Day(%q) = %v, want an error", test.raw, got)
				}

				return
			}

			if err != nil {
				t.Fatalf("Day(%q) failed: %v", test.raw, err)
			}

			if formatted := got.Format("2006-01-02"); formatted != test.want {
				t.Fatalf("Day(%q) = %s, want %s", test.raw, formatted, test.want)
			}
		})
	}
}
