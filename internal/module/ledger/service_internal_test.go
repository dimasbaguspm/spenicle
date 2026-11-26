package ledger

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type sheetRate struct {
	base, quote, rate string
	on                time.Time
}

// stubRates answers like the fx_rates table: the nearest row at or before the day,
// carrying its own source, so the resolver's labelling is what the test asserts.
type stubRates struct{ rows []sheetRate }

func (s stubRates) Rate(_ context.Context, base, quote string, on time.Time) (entity.Rate, bool, error) {
	best := entity.Rate{}
	found := false

	for _, row := range s.rows {
		if row.base != base || row.quote != quote || row.on.After(on) {
			continue
		}

		if !found || row.on.After(best.OnDate) {
			best = entity.Rate{
				Base:   row.base,
				Quote:  row.quote,
				OnDate: row.on,
				Rate:   row.rate,
				Source: constant.FXSourceECB,
			}
			found = true
		}
	}

	return best, found, nil
}

func TestResolveRate(t *testing.T) {
	t.Parallel()

	friday := time.Date(2026, time.November, 20, 0, 0, 0, 0, time.UTC)
	saturday := time.Date(2026, time.November, 21, 0, 0, 0, 0, time.UTC)

	sheet := stubRates{rows: []sheetRate{
		{base: "EUR", quote: "USD", rate: "1.0990", on: friday},
		{base: "EUR", quote: "IDR", rate: "16000.50", on: friday},
	}}

	tests := []struct {
		name       string
		rates      RateSource
		on         time.Time
		native     string
		base       string
		wantRate   string
		wantSource string
		wantDate   time.Time
		wantErr    bool
	}{
		{
			name:       "an exact day uses the sheet",
			rates:      sheet,
			on:         friday,
			native:     "EUR",
			base:       "IDR",
			wantRate:   "16000.50",
			wantSource: constant.FXSourceECB,
			wantDate:   friday,
		},
		{
			name:       "a day after the sheet carries it, never a future one",
			rates:      sheet,
			on:         saturday,
			native:     "EUR",
			base:       "IDR",
			wantRate:   "16000.50",
			wantSource: constant.FXSourceCached,
			wantDate:   friday,
		},
		{
			name:       "two EUR legs make a cross rate",
			rates:      sheet,
			on:         friday,
			native:     "USD",
			base:       "IDR",
			wantRate:   "14559.144676979072",
			wantSource: constant.FXSourceCached,
			wantDate:   friday,
		},
		{
			name:       "the EUR leg inverts when the base is EUR",
			rates:      sheet,
			on:         friday,
			native:     "USD",
			base:       "EUR",
			wantRate:   "0.909918107370",
			wantSource: constant.FXSourceCached,
			wantDate:   friday,
		},
		{
			name:    "a day nobody fetched is no rate",
			on:      friday,
			native:  "USD",
			base:    "IDR",
			wantErr: true,
		},
		{
			name:    "a day before the sheet is no rate",
			rates:   sheet,
			on:      friday.AddDate(0, 0, -7),
			native:  "USD",
			base:    "IDR",
			wantErr: true,
		},
		{
			name:    "without a rate source nothing resolves",
			on:      friday,
			native:  "USD",
			base:    "IDR",
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			service := &Service{rates: tc.rates}

			rate, err := service.resolveRate(t.Context(), tc.on, tc.native, tc.base)
			if tc.wantErr {
				if !errors.Is(err, entity.ErrInvalidRate) {
					t.Fatalf("err = %v, want invalid_rate", err)
				}

				return
			}

			if err != nil {
				t.Fatalf("resolve rate: %v", err)
			}

			if rate.Rate != tc.wantRate {
				t.Fatalf("rate = %q, want %q", rate.Rate, tc.wantRate)
			}

			if rate.Source != tc.wantSource {
				t.Fatalf("source = %q, want %q", rate.Source, tc.wantSource)
			}

			if !sameDay(rate.OnDate, tc.wantDate) {
				t.Fatalf("rate date = %s, want %s", rate.OnDate, tc.wantDate)
			}
		})
	}
}

func TestBalanceBaseAllocatesRoundingResidual(t *testing.T) {
	usd, _ := entity.CurrencyByCode("USD")
	idr, _ := entity.CurrencyByCode("IDR")

	tests := []struct {
		name     string
		from     entity.Currency
		to       entity.Currency
		postings []entity.Posting
		want     []int64
		wantErr  error
	}{
		{
			name: "a balanced base is unchanged",
			from: usd, to: idr,
			postings: []entity.Posting{
				{AmountMinor: 1, BaseAmountMinor: 163},
				{AmountMinor: -1, BaseAmountMinor: -163},
			},
			want: []int64{163, -163},
		},
		{
			name: "a split residual lands on the largest posting",
			from: usd, to: idr,
			postings: []entity.Posting{
				{AmountMinor: 1, BaseAmountMinor: 163},
				{AmountMinor: 1, BaseAmountMinor: 163},
				{AmountMinor: -2, BaseAmountMinor: -325},
			},
			want: []int64{163, 163, -326},
		},
		{
			name: "an unbalanced native entry is refused",
			from: usd, to: idr,
			postings: []entity.Posting{
				{AmountMinor: 1, BaseAmountMinor: 163},
			},
			wantErr: entity.ErrZeroSum,
		},
		{
			name: "a base residual without a conversion is refused",
			from: usd, to: usd,
			postings: []entity.Posting{
				{AmountMinor: 1, BaseAmountMinor: 1},
				{AmountMinor: -1, BaseAmountMinor: 0},
			},
			wantErr: entity.ErrInvalidPostings,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := balanceBase(test.postings, test.from, test.to)
			if test.wantErr != nil {
				if !errors.Is(err, test.wantErr) {
					t.Fatalf("err = %v, want %v", err, test.wantErr)
				}

				return
			}

			if err != nil {
				t.Fatalf("balance base: %v", err)
			}

			base := make([]int64, 0, len(got))
			for _, posting := range got {
				base = append(base, posting.BaseAmountMinor)
			}

			if !slices.Equal(base, test.want) {
				t.Fatalf("base amounts = %v, want %v", base, test.want)
			}

			if err := entity.CheckZeroSum(got); err != nil {
				t.Fatalf("balanced postings still fail: %v", err)
			}
		})
	}
}
