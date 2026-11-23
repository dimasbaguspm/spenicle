package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
)

const (
	catchUpCap     = 60
	dueLimit       = 100
	daysPerWeek    = 7
	clientIDPrefix = "recurring:"
	fallbackNote   = "recurring rule"
)

func (r *Runner) Run(ctx context.Context) (Summary, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Recurring.Run")
	defer endSpan()

	now := r.clock.Now()

	due, err := r.rules.DueRecurring(ctx, now, dueLimit)
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

	r.record(ctx, now)

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
	due := rule.NextDueOn

	for count := 0; count < catchUpCap && !due.After(now); count++ {
		created, err := r.post(ctx, rule, due)
		if err != nil {
			summary.Failed++

			return err
		}

		if created {
			summary.Posted++
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

func (r *Runner) post(ctx context.Context, rule entity.Recurring, due time.Time) (bool, error) {
	input, err := r.postInput(ctx, rule, due)
	if err != nil {
		return false, err
	}

	_, created, err := r.entries.Post(ctx, input)
	if err != nil {
		return false, err
	}

	return created, nil
}

func (r *Runner) postInput(
	ctx context.Context,
	rule entity.Recurring,
	due time.Time,
) (ledger.PostInput, error) {
	categoryRef, err := r.categoryRef(ctx, rule.CategoryRef)
	if err != nil {
		return ledger.PostInput{}, err
	}

	return ledger.PostInput{
		ClientID:   clientIDPrefix + rule.Ref + ":" + due.Format(constant.DateLayout),
		OccurredOn: due,
		Note:       r.payeeName(ctx, rule.PayeeRef),
		Currency:   rule.Currency,
		Source:     constant.EntrySourceRecurring,
		Postings: []ledger.PostingInput{
			{AccountRef: rule.AccountRef, AmountMinor: -rule.AmountMinor},
			{AccountRef: categoryRef, AmountMinor: rule.AmountMinor},
		},
	}, nil
}

func (r *Runner) categoryRef(ctx context.Context, ref string) (string, error) {
	if ref != "" {
		return ref, nil
	}

	account, found, err := r.store.FindAccount(
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense)
	if err != nil {
		return "", fmt.Errorf("find account %s: %w", constant.SeedExpenseAccount, err)
	}

	if !found {
		return "", fmt.Errorf("%w: account %s", entity.ErrNotFound, constant.SeedExpenseAccount)
	}

	return account.Ref, nil
}

func (r *Runner) payeeName(ctx context.Context, ref string) string {
	payee, found, err := r.store.PayeeByRef(ctx, ref)
	if err != nil || !found {
		return fallbackNote
	}

	return payee.Name
}

func (r *Runner) tick(ctx context.Context) {
	summary, err := r.Run(ctx)
	if err != nil {
		r.logger.ErrorContext(ctx, "recurring run failed", slog.Any("error", err))

		return
	}

	r.logger.InfoContext(ctx, "recurring run finished",
		slog.Int("posted", summary.Posted),
		slog.Int("skipped", summary.Skipped))
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
