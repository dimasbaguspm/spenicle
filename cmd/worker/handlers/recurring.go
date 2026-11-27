package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/actor"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
)

const (
	catchUpCap     = 60
	dueLimit       = 100
	daysPerWeek    = 7
	minutesPerHour = 60
	minutesPerDay  = 24 * minutesPerHour
)

func (r *Runner) Run(ctx context.Context) (Summary, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Recurring.Run")
	defer endSpan()

	ctx = actor.With(ctx, actor.From{Kind: constant.AuditActorWorker})

	now := r.clock.Now()

	due, err := r.rules.DueRecurring(ctx, localTime(now, 0, 0, r.zone()), dueLimit)
	if err != nil {
		return Summary{}, fmt.Errorf("due recurring rules: %w", err)
	}

	var (
		summary  Summary
		firstErr error
	)

	for _, rule := range due {
		ruleErr := r.runRule(ctx, rule, now, &summary)
		if ruleErr != nil && firstErr == nil {
			firstErr = fmt.Errorf("recurring rule %s: %w", rule.Ref, ruleErr)
		}
	}

	r.collect(ctx, now)
	r.collectImports(ctx, now)
	r.collectUploads(ctx, now)
	r.runExports(ctx, now)
	r.runIntake(ctx, now)
	r.optimizeStats(ctx)
	r.record(ctx, r.clock.Now())

	return summary, firstErr
}

func (r *Runner) Serve(ctx context.Context, every time.Duration) {
	r.tick(ctx)

	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.tick(ctx)
		}
	}
}

func (r *Runner) runRule(
	ctx context.Context,
	rule entity.Recurring,
	now time.Time,
	summary *Summary,
) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Recurring.RunRule")
	defer endSpan()

	telemetry.Ref(ctx, rule.Ref)

	due := localTime(rule.NextDueOn, 0, 0, r.zone())
	today := localTime(now, 0, 0, r.zone())

	for count := 0; count < catchUpCap && !due.After(today) && !pastEnd(rule, due); count++ {
		created, err := r.enqueue(ctx, rule, due)
		if err != nil {
			summary.Failed++

			return err
		}

		if created {
			summary.Queued++
		} else {
			summary.Skipped++
		}

		next := nextOccurrence(due, rule)

		advanced, err := r.store.AdvanceRecurring(ctx, rule.Ref, due, next, now)
		if err != nil {
			summary.Failed++

			return fmt.Errorf("advance recurring rule %s: %w", rule.Ref, err)
		}

		if !advanced {
			summary.Skipped++

			return nil
		}

		due = next
	}

	return nil
}

func (r *Runner) enqueue(ctx context.Context, rule entity.Recurring, due time.Time) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Recurring.Enqueue")
	defer endSpan()

	draft, err := r.draft(ctx, rule, due)
	if err != nil {
		return false, err
	}

	_, created, err := r.queue.Enqueue(ctx, draft)
	if err != nil {
		return false, err
	}

	return created, nil
}

func (r *Runner) draft(
	ctx context.Context,
	rule entity.Recurring,
	due time.Time,
) (captures.EnqueueInput, error) {
	categoryRef, err := r.categoryRef(ctx, rule.CategoryRef)
	if err != nil {
		return captures.EnqueueInput{}, err
	}

	return captures.EnqueueInput{
		RuleRef:     rule.Ref,
		OccurredOn:  due,
		PayeeRef:    rule.PayeeRef,
		AccountRef:  rule.AccountRef,
		CategoryRef: categoryRef,
		AmountMinor: rule.AmountMinor,
		Currency:    rule.Currency,
	}, nil
}

func (r *Runner) categoryRef(ctx context.Context, ref string) (string, error) {
	if ref != "" {
		return ref, nil
	}

	account, found, err := r.store.FindAccount(
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense,
	)
	if err != nil {
		return "", fmt.Errorf("find account %s: %w", constant.SeedExpenseAccount, err)
	}

	if !found {
		return "", fmt.Errorf("%w: account %s", entity.ErrNotFound, constant.SeedExpenseAccount)
	}

	return account.Ref, nil
}

func (r *Runner) tick(ctx context.Context) {
	start := time.Now()

	summary, err := r.Run(ctx)

	outcome := telemetry.OutcomeOK
	if err != nil {
		outcome = telemetry.OutcomeFailed
	}

	telemetry.RecordWorkerRun(ctx, telemetry.JobRecurring, outcome, int64(summary.Queued), time.Since(start))

	if err != nil {
		r.logger.Error(ctx, "recurring run failed", slog.Any("error", err))

		return
	}

	r.logger.Info(ctx, "recurring run finished",
		slog.Int("queued", summary.Queued),
		slog.Int("skipped", summary.Skipped))
}

// localTime is the wall clock of day in loc, clamped forward when the offset
// skips it: 02:30 on a spring-forward morning becomes the 03:00 that exists.
func localTime(day time.Time, hour, minute int, loc *time.Location) time.Time {
	year, month, date := day.Date()
	want := time.Date(year, month, date, hour, minute, 0, 0, loc)

	if want.Hour() == hour && want.Minute() == minute {
		return want
	}

	target := hour*minutesPerHour + minute
	midnight := time.Date(year, month, date, 0, 0, 0, 0, loc)

	for elapsed := 0; elapsed <= minutesPerDay; elapsed++ {
		candidate := midnight.Add(time.Duration(elapsed) * time.Minute)
		local := candidate.In(loc)

		if local.Day() == date && local.Hour()*minutesPerHour+local.Minute() >= target {
			return candidate
		}
	}

	return want
}

func pastEnd(rule entity.Recurring, due time.Time) bool {
	return rule.EndsOn != nil && due.After(*rule.EndsOn)
}

func nextOccurrence(due time.Time, rule entity.Recurring) time.Time {
	return shiftToBusinessDay(advance(due, rule), rule.BusinessDayShift)
}

func advance(due time.Time, rule entity.Recurring) time.Time {
	step := rule.IntervalN
	if step < 1 {
		step = 1
	}

	switch rule.Cadence {
	case constant.RecurringCadenceDaily:
		return due.AddDate(0, 0, step)
	case constant.RecurringCadenceWeekly:
		return due.AddDate(0, 0, daysPerWeek*step)
	case constant.RecurringCadenceYearly:
		return due.AddDate(step, 0, 0)
	default:
		return advanceMonthly(due, rule.DayOfMonth, step)
	}
}

func advanceMonthly(due time.Time, dayOfMonth, step int) time.Time {
	day := dayOfMonth
	if day == 0 {
		day = due.Day()
	}

	first := time.Date(due.Year(), due.Month(), 1, 0, 0, 0, 0, due.Location()).AddDate(0, step, 0)
	if last := daysIn(first); day > last {
		day = last
	}

	return time.Date(first.Year(), first.Month(), day, 0, 0, 0, 0, due.Location())
}

func daysIn(month time.Time) int {
	return time.Date(month.Year(), month.Month()+1, 0, 0, 0, 0, 0, month.Location()).Day()
}

func shiftToBusinessDay(day time.Time, shift string) time.Time {
	switch shift {
	case constant.ShiftNext:
		for weekend(day) {
			day = day.AddDate(0, 0, 1)
		}
	case constant.ShiftPrev:
		for weekend(day) {
			day = day.AddDate(0, 0, -1)
		}
	}

	return day
}

func weekend(day time.Time) bool {
	return day.Weekday() == time.Saturday || day.Weekday() == time.Sunday
}
