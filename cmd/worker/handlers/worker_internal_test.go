package handlers

import (
	"context"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
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

type stubLedger struct{ posts []ledger.PostInput }

func (s *stubLedger) Post(_ context.Context, in ledger.PostInput) (entity.Entry, bool, error) {
	s.posts = append(s.posts, in)

	return entity.Entry{}, true, nil
}

func (s *stubLedger) List(context.Context, entity.EntryFilter) ([]entity.Entry, error) {
	return nil, nil
}

func (s *stubLedger) Void(context.Context, string, string) (entity.Entry, error) {
	return entity.Entry{}, nil
}

func (s *stubLedger) UpdatePayee(context.Context, string, string) (entity.Entry, error) {
	return entity.Entry{}, nil
}

type stubStore struct{ advanced int }

func (s *stubStore) DueRecurring(context.Context, time.Time, int) ([]entity.Recurring, error) {
	return nil, nil
}

func (s *stubStore) AdvanceRecurring(
	context.Context, string, time.Time, time.Time, time.Time,
) (bool, error) {
	s.advanced++

	return true, nil
}

func (s *stubStore) PayeeByRef(context.Context, string) (entity.Payee, bool, error) {
	return entity.Payee{Name: "Kopi Kenangan"}, true, nil
}

func (s *stubStore) FindAccount(context.Context, string, string) (entity.Account, bool, error) {
	return entity.Account{Ref: "0123456789abcdef0123456789abcdef"}, true, nil
}

func (s *stubStore) SetSetting(context.Context, string, string) error { return nil }

func TestRunRuleStopsAtEndsOn(t *testing.T) {
	ends := parseDay(t, "2026-04-10")

	cases := []struct {
		name       string
		nextDueOn  string
		wantPosted int
		wantLast   string
	}{
		{name: "stops at ends_on", nextDueOn: "2026-04-08", wantPosted: 3, wantLast: "2026-04-10"},
		{name: "posts nothing past ends_on", nextDueOn: "2026-04-12", wantPosted: 0},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			rule := entity.Recurring{
				Ref:              "0123456789abcdef0123456789abcdef",
				PayeeRef:         "0123456789abcdef0123456789abcdef",
				AccountRef:       "0123456789abcdef0123456789abcdef",
				CategoryRef:      "0123456789abcdef0123456789abcdef",
				AmountMinor:      25_000,
				Currency:         "IDR",
				Cadence:          constant.RecurringCadenceDaily,
				IntervalN:        1,
				BusinessDayShift: constant.ShiftNone,
				NextDueOn:        parseDay(t, testCase.nextDueOn),
				EndsOn:           &ends,
				State:            constant.RecurringStateActive,
			}

			entries := &stubLedger{}
			rules := &Runner{store: &stubStore{}, entries: entries}

			var summary Summary
			if err := rules.runRule(
				t.Context(), rule, parseDay(t, "2026-04-15"), &summary); err != nil {
				t.Fatalf("run rule: %v", err)
			}

			if len(entries.posts) != testCase.wantPosted {
				t.Fatalf("posted %d entries, want %d", len(entries.posts), testCase.wantPosted)
			}
			if summary.Posted != testCase.wantPosted {
				t.Fatalf("summary posted = %d, want %d", summary.Posted, testCase.wantPosted)
			}
			if testCase.wantPosted == 0 {
				return
			}

			last := entries.posts[len(entries.posts)-1].OccurredOn.Format(constant.DateLayout)
			if last != testCase.wantLast {
				t.Fatalf("last posted on %s, want %s", last, testCase.wantLast)
			}
		})
	}
}

func TestLocalTimeClampsAcrossSpringForward(t *testing.T) {
	cases := []struct {
		name   string
		zone   string
		day    string
		hour   int
		minute int
		want   string
	}{
		{
			name: "an ordinary wall clock is kept", zone: "America/New_York", day: "2025-03-08",
			hour: 2, minute: 30, want: "2025-03-08T02:30:00-05:00",
		},
		{
			name: "02:30 on a spring-forward morning clamps to 03:00", zone: "America/New_York",
			day: "2025-03-09", hour: 2, minute: 30, want: "2025-03-09T03:00:00-04:00",
		},
		{
			name: "a zone without DST is untouched", zone: "Asia/Jakarta", day: "2025-03-09",
			hour: 2, minute: 30, want: "2025-03-09T02:30:00+07:00",
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			location, err := time.LoadLocation(testCase.zone)
			if err != nil {
				t.Fatalf("zone %q: %v", testCase.zone, err)
			}

			got := localTime(parseDay(t, testCase.day), testCase.hour, testCase.minute, location)
			if formatted := got.Format(time.RFC3339); formatted != testCase.want {
				t.Fatalf("local time = %s, want %s", formatted, testCase.want)
			}
		})
	}
}

func TestRunRuleUsesTheInstanceTimezone(t *testing.T) {
	cases := []struct {
		name       string
		zone       string
		wantPosted int
	}{
		{name: "23:30 UTC is already tomorrow in Jakarta", zone: "Asia/Jakarta", wantPosted: 1},
		{name: "the same instant in UTC is still today", zone: "UTC", wantPosted: 0},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			location, err := time.LoadLocation(testCase.zone)
			if err != nil {
				t.Fatalf("zone %q: %v", testCase.zone, err)
			}

			at := time.Date(2025, 1, 1, 23, 30, 0, 0, time.UTC).In(location)

			rule := entity.Recurring{
				Ref:              "0123456789abcdef0123456789abcdef",
				PayeeRef:         "0123456789abcdef0123456789abcdef",
				AccountRef:       "0123456789abcdef0123456789abcdef",
				CategoryRef:      "0123456789abcdef0123456789abcdef",
				AmountMinor:      25_000,
				Currency:         "IDR",
				Cadence:          constant.RecurringCadenceDaily,
				IntervalN:        1,
				BusinessDayShift: constant.ShiftNone,
				NextDueOn:        parseDay(t, "2025-01-02"),
				State:            constant.RecurringStateActive,
			}

			entries := &stubLedger{}
			rules := &Runner{store: &stubStore{}, entries: entries, loc: location}

			var summary Summary
			if runErr := rules.runRule(t.Context(), rule, at, &summary); runErr != nil {
				t.Fatalf("run rule: %v", runErr)
			}

			if len(entries.posts) != testCase.wantPosted {
				t.Fatalf("posted %d entries, want %d", len(entries.posts), testCase.wantPosted)
			}
		})
	}
}
