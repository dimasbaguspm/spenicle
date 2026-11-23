package worker

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func parseDay(t *testing.T, value string) time.Time {
	t.Helper()

	day, err := time.Parse(constant.DateLayout, value)
	if err != nil {
		t.Fatalf("parse %q: %v", value, err)
	}

	return day
}

func TestNextOccurrence(t *testing.T) {
	cases := []struct {
		name string
		rule entity.Recurring
		due  string
		want string
	}{
		{
			name: "daily",
			rule: entity.Recurring{Cadence: constant.RecurringCadenceDaily, IntervalN: 1},
			due:  "2026-04-14",
			want: "2026-04-15",
		},
		{
			name: "weekly",
			rule: entity.Recurring{Cadence: constant.RecurringCadenceWeekly, IntervalN: 1},
			due:  "2026-04-14",
			want: "2026-04-21",
		},
		{
			name: "every other week",
			rule: entity.Recurring{Cadence: constant.RecurringCadenceWeekly, IntervalN: 2},
			due:  "2026-04-14",
			want: "2026-04-28",
		},
		{
			name: "monthly keeps its day of month",
			rule: entity.Recurring{
				Cadence: constant.RecurringCadenceMonthly, IntervalN: 1, DayOfMonth: 20,
			},
			due:  "2026-01-20",
			want: "2026-02-20",
		},
		{
			name: "monthly clamps to the last day of a short month",
			rule: entity.Recurring{Cadence: constant.RecurringCadenceMonthly, IntervalN: 1},
			due:  "2026-01-31",
			want: "2026-02-28",
		},
		{
			name: "monthly rolls the year",
			rule: entity.Recurring{
				Cadence: constant.RecurringCadenceMonthly, IntervalN: 1, DayOfMonth: 20,
			},
			due:  "2026-12-20",
			want: "2027-01-20",
		},
		{
			name: "yearly",
			rule: entity.Recurring{Cadence: constant.RecurringCadenceYearly, IntervalN: 1},
			due:  "2026-04-14",
			want: "2027-04-14",
		},
		{
			name: "the next business day moves off the weekend",
			rule: entity.Recurring{
				Cadence: constant.RecurringCadenceWeekly, IntervalN: 1, BusinessDayShift: constant.ShiftNext,
			},
			due:  "2026-04-25",
			want: "2026-05-04",
		},
		{
			name: "the previous business day moves off the weekend",
			rule: entity.Recurring{
				Cadence: constant.RecurringCadenceWeekly, IntervalN: 1, BusinessDayShift: constant.ShiftPrev,
			},
			due:  "2026-04-19",
			want: "2026-04-24",
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			got := nextOccurrence(parseDay(t, testCase.due), testCase.rule)
			if want := parseDay(t, testCase.want); !got.Equal(want) {
				t.Fatalf("next occurrence = %s, want %s", got.Format(constant.DateLayout), testCase.want)
			}
		})
	}
}
