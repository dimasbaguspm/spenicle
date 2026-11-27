package validating_test

import (
	"testing"
	"time"

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

func TestMoment(t *testing.T) {
	t.Parallel()

	jakarta := time.FixedZone("Asia/Jakarta", 7*60*60)

	tests := []struct {
		name    string
		raw     string
		end     bool
		want    string
		wantErr bool
	}{
		{name: "a bare day starts it", raw: "2026-02-14", want: "2026-02-14T00:00:00+07:00"},
		{name: "a day with minutes", raw: "2026-02-14T09:30", want: "2026-02-14T09:30:00+07:00"},
		{name: "a day with seconds", raw: "2026-02-14T09:30:45", want: "2026-02-14T09:30:45+07:00"},
		{name: "a bare day ends it", raw: "2026-02-14", end: true, want: "2026-02-14T23:59:59+07:00"},
		{name: "a moment ends it as itself", raw: "2026-02-14T09:30", end: true, want: "2026-02-14T09:30:00+07:00"},
		{name: "rfc3339 keeps its offset", raw: "2026-02-14T09:30:00Z", want: "2026-02-14T16:30:00+07:00"},
		{name: "a month without a day is refused", raw: "2026-02", wantErr: true},
		{name: "a day that does not exist is refused", raw: "2026-02-30", wantErr: true},
		{name: "an empty value is refused", raw: " ", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			var (
				got time.Time
				err error
			)

			if test.end {
				got, err = validating.MomentEnd(test.raw, "to", jakarta)
			} else {
				got, err = validating.Moment(test.raw, "from", jakarta)
			}

			if test.wantErr {
				if err == nil {
					t.Fatalf("Moment(%q) = %v, want an error", test.raw, got)
				}

				return
			}

			if err != nil {
				t.Fatalf("Moment(%q) failed: %v", test.raw, err)
			}

			if formatted := got.In(jakarta).Format(time.RFC3339); formatted != test.want {
				t.Fatalf("Moment(%q) = %s, want %s", test.raw, formatted, test.want)
			}
		})
	}
}
