package sqlite_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type monthSpend struct {
	month  string
	amount int64
}

type categoryMonths struct {
	account string
	months  []monthSpend
}

type datedSpending struct {
	account string
	on      time.Time
	amount  int64
}

func TestCategoryTotalsByMonth(t *testing.T) {
	january := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	february := time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC)

	windowStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	windowEnd := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name   string
		spends []datedSpending
		voided []int
		from   time.Time
		to     time.Time
		want   []categoryMonths
	}{
		{
			name: "two categories across two months",
			spends: []datedSpending{
				{account: "travel", on: february, amount: 7_000},
				{account: "food", on: february, amount: 12_000},
				{account: "food", on: january, amount: 10_000},
			},
			from: windowStart,
			to:   windowEnd,
			want: []categoryMonths{
				{account: "food", months: []monthSpend{
					{month: "2026-01", amount: 10_000},
					{month: "2026-02", amount: 12_000},
				}},
				{account: "travel", months: []monthSpend{{month: "2026-02", amount: 7_000}}},
			},
		},
		{
			name: "a voided entry leaves no month",
			spends: []datedSpending{
				{account: "food", on: january, amount: 10_000},
				{account: "food", on: february, amount: 9_000},
			},
			voided: []int{1},
			from:   windowStart,
			to:     windowEnd,
			want: []categoryMonths{
				{account: "food", months: []monthSpend{{month: "2026-01", amount: 10_000}}},
			},
		},
		{
			name: "a month outside the window is dropped",
			spends: []datedSpending{
				{account: "food", on: january, amount: 10_000},
				{account: "food", on: february, amount: 9_000},
			},
			from: february.AddDate(0, 0, -1),
			to:   windowEnd,
			want: []categoryMonths{
				{account: "food", months: []monthSpend{{month: "2026-02", amount: 9_000}}},
			},
		},
		{
			name: "an empty window yields no category",
			spends: []datedSpending{
				{account: "food", on: january, amount: 10_000},
			},
			from: windowEnd.AddDate(0, 1, 0),
			to:   windowEnd.AddDate(0, 2, 0),
			want: []categoryMonths{},
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			requireCategoryMonths(t, testCase.spends, testCase.voided, testCase.from, testCase.to, testCase.want)
		})
	}
}

func requireCategoryMonths(
	t *testing.T,
	spends []datedSpending,
	voided []int,
	from, to time.Time,
	want []categoryMonths,
) {
	t.Helper()

	ctx := t.Context()
	store, accounts := rollupTree(t)

	entries := insertDatedSpending(t, store, accounts, spends)

	for _, index := range voided {
		if _, err := store.VoidEntry(ctx, entries[index].Ref, "test", entries[index].CreatedAt); err != nil {
			t.Fatalf("void entry: %v", err)
		}
	}

	totals, err := store.CategoryTotalsByMonth(ctx, from, to, "expense")
	if err != nil {
		t.Fatalf("category months: %v", err)
	}

	if len(totals) != len(want) {
		t.Fatalf("categories = %v, want %v", totals, want)
	}

	for i, expected := range want {
		if accountKey(accounts, totals[i].AccountRef) != expected.account {
			t.Fatalf("category %d = %q, want %q", i, totals[i].AccountName, expected.account)
		}

		if len(totals[i].Months) != len(expected.months) {
			t.Fatalf("%s months = %v, want %v", expected.account, totals[i].Months, expected.months)
		}

		for j, month := range expected.months {
			if totals[i].Months[j].Month != month.month || totals[i].Months[j].AmountMinor != month.amount {
				t.Fatalf("%s month %d = %v, want %v", expected.account, j, totals[i].Months[j], month)
			}
		}
	}
}

func insertDatedSpending(
	t *testing.T,
	store *sqlite.Store,
	accounts map[string]entity.Account,
	spends []datedSpending,
) []entity.Entry {
	t.Helper()

	entries := make([]entity.Entry, 0, len(spends))

	for _, spend := range spends {
		amount := spend.amount

		entry, err := entity.NewEntry(entity.Entry{
			OccurredOn: spend.on,
			Currency:   "IDR",
			Postings: []entity.Posting{
				{
					AccountID:       accounts[spend.account].ID,
					AmountMinor:     amount,
					BaseAmountMinor: amount,
				},
				{
					AccountID:       accounts["cash"].ID,
					AmountMinor:     -amount,
					BaseAmountMinor: -amount,
				},
			},
		})
		if err != nil {
			t.Fatalf("new entry: %v", err)
		}

		saved, err := store.InsertEntry(t.Context(), entry)
		if err != nil {
			t.Fatalf("insert entry: %v", err)
		}

		entries = append(entries, saved)
	}

	return entries
}
