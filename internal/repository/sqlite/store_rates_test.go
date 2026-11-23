package sqlite_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

var (
	rateDay       = time.Date(2026, time.November, 20, 0, 0, 0, 0, time.UTC)
	rateFetchedAt = time.Date(2026, time.November, 20, 15, 30, 0, 0, time.UTC)
)

func usdRate(value string) []entity.Rate {
	return []entity.Rate{{
		Base:      "EUR",
		Quote:     "USD",
		OnDate:    rateDay,
		Rate:      value,
		Source:    constant.FXSourceECB,
		FetchedAt: rateFetchedAt,
	}}
}

func TestRatesRoundTrip(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	ctx := t.Context()

	if err := store.SaveRates(ctx, usdRate("1.1598")); err != nil {
		t.Fatalf("save rates: %v", err)
	}

	saved, found, err := store.RateOn(ctx, "EUR", "USD", rateDay)
	if err != nil {
		t.Fatalf("read rate: %v", err)
	}

	if !found {
		t.Fatal("rate not found after save")
	}

	if saved.Rate != "1.1598" || saved.Source != constant.FXSourceECB {
		t.Fatalf("rate = %+v", saved)
	}

	if !saved.OnDate.Equal(rateDay) || !saved.FetchedAt.Equal(rateFetchedAt) {
		t.Fatalf("timestamps = %s / %s", saved.OnDate, saved.FetchedAt)
	}
}

func TestRatesAreAbsentForAnUnfetchedPair(t *testing.T) {
	t.Parallel()

	store := newStore(t)

	_, found, err := store.RateOn(t.Context(), "EUR", "IDR", rateDay)
	if err != nil {
		t.Fatalf("read rate: %v", err)
	}

	if found {
		t.Fatal("expected no rate before the first fetch")
	}
}

func TestRatesUpsertReplacesTheSameDay(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	ctx := t.Context()

	if err := store.SaveRates(ctx, usdRate("1.1598")); err != nil {
		t.Fatalf("save rates: %v", err)
	}

	if err := store.SaveRates(ctx, usdRate("1.1700")); err != nil {
		t.Fatalf("save rates again: %v", err)
	}

	updated, found, err := store.RateOn(ctx, "EUR", "USD", rateDay)
	if err != nil || !found {
		t.Fatalf("read updated rate: found=%v err=%v", found, err)
	}

	if updated.Rate != "1.1700" {
		t.Fatalf("second save did not replace the first: %q", updated.Rate)
	}
}
