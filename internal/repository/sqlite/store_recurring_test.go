package sqlite_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func parseDate(t *testing.T, value string) time.Time {
	t.Helper()

	day, err := time.Parse(constant.DateLayout, value)
	if err != nil {
		t.Fatalf("parse %q: %v", value, err)
	}

	return day
}

func seedRecurring(
	t *testing.T,
	store *sqlite.Store,
	accountRef, payeeName, nextDueOn string,
	endsOn *time.Time,
) entity.Recurring {
	t.Helper()

	ctx := t.Context()

	payee, err := store.CreatePayee(ctx, entity.Payee{Name: payeeName})
	if err != nil {
		t.Fatalf("create payee: %v", err)
	}

	created, err := store.CreateRecurring(ctx, entity.Recurring{
		PayeeRef:         payee.Ref,
		AccountRef:       accountRef,
		AmountMinor:      25_000,
		Currency:         "IDR",
		Cadence:          constant.RecurringCadenceMonthly,
		IntervalN:        1,
		BusinessDayShift: constant.ShiftNone,
		NextDueOn:        parseDate(t, nextDueOn),
		EndsOn:           endsOn,
		State:            constant.RecurringStateActive,
	})
	if err != nil {
		t.Fatalf("create recurring: %v", err)
	}

	return created
}

func readRecurring(t *testing.T, store *sqlite.Store, ref string) entity.Recurring {
	t.Helper()

	rule, found, err := store.RecurringByRef(t.Context(), ref)
	if err != nil {
		t.Fatalf("read recurring: %v", err)
	}
	if !found {
		t.Fatal("recurring rule not found by ref")
	}

	return rule
}

func requireEndsOn(t *testing.T, rule entity.Recurring, want *time.Time) {
	t.Helper()

	if want == nil {
		if rule.EndsOn != nil {
			t.Fatalf("ends_on = %s, want null", rule.EndsOn.Format(constant.DateLayout))
		}

		return
	}

	if rule.EndsOn == nil {
		t.Fatal("ends_on lost on the round trip")
	}
	if !rule.EndsOn.Equal(*want) {
		t.Fatalf("ends_on = %s, want %s",
			rule.EndsOn.Format(constant.DateLayout), want.Format(constant.DateLayout))
	}
}

func TestRecurringEndsOnRoundTrip(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	asset, _ := baseline(t, store)
	ends := parseDate(t, "2026-05-31")
	rule := seedRecurring(t, store, asset.Ref, "Kopi Kenangan", "2026-04-20", &ends)
	requireEndsOn(t, readRecurring(t, store, rule.Ref), &ends)

	later := ends.AddDate(0, 1, 0)
	rule.EndsOn = &later

	if _, err := store.UpdateRecurring(ctx, rule); err != nil {
		t.Fatalf("update recurring: %v", err)
	}

	requireEndsOn(t, readRecurring(t, store, rule.Ref), &later)

	rule.EndsOn = nil

	if _, err := store.UpdateRecurring(ctx, rule); err != nil {
		t.Fatalf("clear ends_on: %v", err)
	}

	requireEndsOn(t, readRecurring(t, store, rule.Ref), nil)
}

func TestDueRecurringSkipsRulesPastEndsOn(t *testing.T) {
	store := newStore(t)

	asset, _ := baseline(t, store)
	ended := parseDate(t, "2026-04-10")
	open := parseDate(t, "2026-04-30")

	seedRecurring(t, store, asset.Ref, "Kopi Kenangan", "2026-04-14", &ended)
	seedRecurring(t, store, asset.Ref, "Toko Roti", "2026-04-14", &open)

	due, err := store.DueRecurring(t.Context(), parseDate(t, "2026-04-15"), 10)
	if err != nil {
		t.Fatalf("due recurring: %v", err)
	}

	if len(due) != 1 {
		t.Fatalf("due rules = %d, want 1: a rule whose ends_on is past must not be due", len(due))
	}

	requireEndsOn(t, due[0], &open)
}
