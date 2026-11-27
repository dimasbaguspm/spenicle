package handlers

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
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

type stubQueue struct{ drafts []captures.EnqueueInput }

func (s *stubQueue) Enqueue(
	_ context.Context, in captures.EnqueueInput,
) (entity.Capture, bool, error) {
	s.drafts = append(s.drafts, in)

	return entity.Capture{}, true, nil
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

func (s *stubStore) FindAccount(context.Context, string, string) (entity.Account, bool, error) {
	return entity.Account{Ref: "0123456789abcdef0123456789abcdef"}, true, nil
}

func (s *stubStore) SetSetting(context.Context, string, string) error { return nil }

func (s *stubStore) OptimizeStats(context.Context) error { return nil }

func TestRunRuleStopsAtEndsOn(t *testing.T) {
	ends := parseDay(t, "2026-04-10")

	cases := []struct {
		name       string
		nextDueOn  string
		wantQueued int
		wantLast   string
	}{
		{name: "stops at ends_on", nextDueOn: "2026-04-08", wantQueued: 3, wantLast: "2026-04-10"},
		{name: "queues nothing past ends_on", nextDueOn: "2026-04-12", wantQueued: 0},
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

			queued := &stubQueue{}
			rules := &Runner{store: &stubStore{}, queue: queued}

			var summary Summary
			if err := rules.runRule(
				t.Context(), rule, parseDay(t, "2026-04-15"), &summary,
			); err != nil {
				t.Fatalf("run rule: %v", err)
			}

			if len(queued.drafts) != testCase.wantQueued {
				t.Fatalf("queued %d captures, want %d", len(queued.drafts), testCase.wantQueued)
			}
			if summary.Queued != testCase.wantQueued {
				t.Fatalf("summary queued = %d, want %d", summary.Queued, testCase.wantQueued)
			}
			if testCase.wantQueued == 0 {
				return
			}

			last := queued.drafts[len(queued.drafts)-1].OccurredOn.Format(constant.DateLayout)
			if last != testCase.wantLast {
				t.Fatalf("last queued for %s, want %s", last, testCase.wantLast)
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
		wantQueued int
	}{
		{name: "23:30 UTC is already tomorrow in Jakarta", zone: "Asia/Jakarta", wantQueued: 1},
		{name: "the same instant in UTC is still today", zone: "UTC", wantQueued: 0},
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

			queued := &stubQueue{}
			rules := &Runner{store: &stubStore{}, queue: queued, loc: location}

			var summary Summary
			if runErr := rules.runRule(t.Context(), rule, at, &summary); runErr != nil {
				t.Fatalf("run rule: %v", runErr)
			}

			if len(queued.drafts) != testCase.wantQueued {
				t.Fatalf("queued %d captures, want %d", len(queued.drafts), testCase.wantQueued)
			}
		})
	}
}

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

type recordingStore struct {
	calls     []string
	heartbeat string
}

func (s *recordingStore) CreateRecurring(
	context.Context, entity.Recurring,
) (entity.Recurring, error) {
	return entity.Recurring{}, nil
}

func (s *recordingStore) RecurringByRef(
	context.Context, string,
) (entity.Recurring, bool, error) {
	return entity.Recurring{}, false, nil
}

func (s *recordingStore) ListRecurring(
	context.Context, entity.RecurringFilter,
) ([]entity.Recurring, error) {
	return nil, nil
}

func (s *recordingStore) UpdateRecurring(
	context.Context, entity.Recurring,
) (entity.Recurring, error) {
	return entity.Recurring{}, nil
}

func (s *recordingStore) DueRecurring(context.Context, time.Time, int) ([]entity.Recurring, error) {
	s.calls = append(s.calls, "due")

	return nil, nil
}

func (s *recordingStore) AdvanceRecurring(
	context.Context, string, time.Time, time.Time, time.Time,
) (bool, error) {
	return true, nil
}

func (s *recordingStore) FindAccount(
	context.Context, string, string,
) (entity.Account, bool, error) {
	return entity.Account{}, false, nil
}

func (s *recordingStore) SetSetting(_ context.Context, key, value string) error {
	if key == constant.SettingWorkerLastRunAt {
		s.calls = append(s.calls, "heartbeat")
		s.heartbeat = value
	}

	return nil
}

func (s *recordingStore) OptimizeStats(context.Context) error {
	s.calls = append(s.calls, "optimize")

	return nil
}

func TestRunRecordsTheHeartbeatAfterTheWork(t *testing.T) {
	at := time.Date(2026, 4, 15, 9, 0, 0, 0, time.UTC)
	store := &recordingStore{}
	runner := &Runner{
		rules: store, store: store, queue: &stubQueue{}, clock: fixedClock{at: at},
	}

	if _, err := runner.Run(t.Context()); err != nil {
		t.Fatalf("run: %v", err)
	}

	if got, want := strings.Join(store.calls, ","), "due,optimize,heartbeat"; got != want {
		t.Fatalf("worker calls = %q, want %q", got, want)
	}
	if want := at.Format(constant.TimestampLayout); store.heartbeat != want {
		t.Fatalf("heartbeat = %q, want %q", store.heartbeat, want)
	}
}
