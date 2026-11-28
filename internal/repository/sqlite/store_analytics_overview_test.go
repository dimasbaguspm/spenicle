package sqlite_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type overviewFixture struct {
	store  *sqlite.Store
	cash   entity.Account
	food   entity.Account
	salary entity.Account
	payee  entity.Payee
}

func newOverviewFixture(t *testing.T) overviewFixture {
	t.Helper()

	store := newStore(t)

	payee, err := store.CreatePayee(t.Context(), entity.Payee{Name: "Corner shop"})
	if err != nil {
		t.Fatalf("create payee: %v", err)
	}

	return overviewFixture{
		store:  store,
		cash:   createAccountNamed(t, store, "Cash", "asset"),
		food:   createAccountNamed(t, store, "Food", "expense"),
		salary: createAccountNamed(t, store, "Salary", "income"),
		payee:  payee,
	}
}

func (f overviewFixture) post(t *testing.T, on time.Time, amount int64, kind, payeeRef string) entity.Entry {
	t.Helper()

	counter := map[string]entity.Account{"expense": f.food, "income": f.salary}[kind]

	// an expense lands in the expense account and leaves cash; income is the other way round,
	// which is the whole reason a ledger has two sides
	signed := amount
	if kind == "income" {
		signed = -amount
	}

	entry, err := entity.NewEntry(entity.Entry{
		OccurredOn: on,
		Currency:   "IDR",
		PayeeRef:   payeeRef,
		Postings: []entity.Posting{
			{AccountRef: counter.Ref, AmountMinor: signed, BaseAmountMinor: signed},
			{AccountRef: f.cash.Ref, AmountMinor: -signed, BaseAmountMinor: -signed},
		},
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	saved, err := f.store.InsertEntry(t.Context(), entry)
	if err != nil {
		t.Fatalf("insert entry: %v", err)
	}

	return saved
}

func TestPayeeTotalsGroupByWhoWasPaid(t *testing.T) {
	fixture := newOverviewFixture(t)
	january := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	february := time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC)

	fixture.post(t, january, 10_000, "expense", fixture.payee.Ref)
	fixture.post(t, january, 5_000, "expense", "")
	fixture.post(t, february, 7_000, "expense", fixture.payee.Ref)
	reversed := fixture.post(t, february, 50_000, "expense", fixture.payee.Ref)

	if _, err := fixture.store.ReverseEntry(t.Context(), reversed.Ref, "test", reversed.CreatedAt); err != nil {
		t.Fatalf("reverse entry: %v", err)
	}

	totals, err := fixture.store.PayeeTotals(t.Context(),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("payee totals: %v", err)
	}

	if len(totals) != 2 {
		t.Fatalf("payees = %v, want two rows", totals)
	}

	if totals[0].PayeeRef != fixture.payee.Ref || totals[0].AmountMinor != 17_000 {
		t.Fatalf("first payee = %v, want the named one with 17000", totals[0])
	}

	if totals[1].PayeeRef != "" || totals[1].AmountMinor != 5_000 {
		t.Fatalf("second payee = %v, want the unnamed row with 5000", totals[1])
	}
}

func TestAccountFlowsSplitInFromOut(t *testing.T) {
	fixture := newOverviewFixture(t)
	january := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	february := time.Date(2026, 2, 5, 0, 0, 0, 0, time.UTC)

	fixture.post(t, january, 10_000, "expense", "")
	fixture.post(t, january, 5_000, "expense", "")
	fixture.post(t, february, 100_000, "income", "")

	flows, err := fixture.store.AccountFlows(t.Context(),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("account flows: %v", err)
	}

	if len(flows) != 1 {
		t.Fatalf("flows = %v, want the one money account", flows)
	}

	if flows[0].AccountRef != fixture.cash.Ref {
		t.Fatalf("flow account = %q, want cash", flows[0].AccountName)
	}

	if flows[0].InflowMinor != 100_000 || flows[0].OutflowMinor != 15_000 || flows[0].NetMinor != 85_000 {
		t.Fatalf("cash flow = %v, want 100000 in, 15000 out, 85000 net", flows[0])
	}
}

func TestLedgerStatsCountEntriesAndNameTheBusiestDay(t *testing.T) {
	fixture := newOverviewFixture(t)
	first := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	second := time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC)

	fixture.post(t, first, 10_000, "expense", "")
	fixture.post(t, first, 5_000, "expense", "")
	fixture.post(t, second, 7_000, "expense", "")
	reversed := fixture.post(t, second, 90_000, "expense", "")

	if _, err := fixture.store.ReverseEntry(t.Context(), reversed.Ref, "test", reversed.CreatedAt); err != nil {
		t.Fatalf("reverse entry: %v", err)
	}

	stats, err := fixture.store.LedgerStats(t.Context(),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ledger stats: %v", err)
	}

	if stats.Entries != 3 {
		t.Fatalf("entries = %d, want 3", stats.Entries)
	}

	if stats.BusiestOn != "2026-01-10" || stats.BusiestSpend != 15_000 {
		t.Fatalf("busiest = %q %d, want 2026-01-10 15000", stats.BusiestOn, stats.BusiestSpend)
	}
}

func TestLedgerStatsOnAnEmptyWindow(t *testing.T) {
	fixture := newOverviewFixture(t)

	stats, err := fixture.store.LedgerStats(t.Context(),
		time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ledger stats: %v", err)
	}

	if stats.Entries != 0 || stats.BusiestOn != "" || stats.BusiestSpend != 0 {
		t.Fatalf("stats = %v, want the zero value", stats)
	}
}
