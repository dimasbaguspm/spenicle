package sqlite_test

import (
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func postCashEntry(
	t *testing.T,
	store *sqlite.Store,
	day time.Time,
	amount int64,
	asset, expense entity.Account,
) entity.Entry {
	t.Helper()

	entry, err := entity.NewEntry(entity.Entry{
		OccurredOn: day,
		Currency:   "IDR",
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{AccountRef: asset.Ref, AmountMinor: -amount, BaseAmountMinor: -amount},
			{AccountRef: expense.Ref, AmountMinor: amount, BaseAmountMinor: amount},
		},
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	saved, err := store.InsertEntry(t.Context(), entry)
	if err != nil {
		t.Fatalf("insert entry: %v", err)
	}

	return saved
}

// balanceLabel renders one listed entry as "day=balance", and as the bare day when
// the field was left out, so a table can state both at once.
func balanceLabel(entry entity.Entry) string {
	label := entry.OccurredOn.Format(constant.DateLayout)

	if entry.RunningBalanceMinor == nil {
		return label
	}

	return label + "=" + strconv.FormatInt(*entry.RunningBalanceMinor, 10)
}

func labelsOf(entries []entity.Entry) []string {
	out := make([]string, 0, len(entries))

	for _, entry := range entries {
		out = append(out, balanceLabel(entry))
	}

	return out
}

func TestListEntriesRunningBalance(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	asset, expense := baseline(t, store)

	first := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	second := first.AddDate(0, 0, 1)
	third := second.AddDate(0, 0, 1)

	postCashEntry(t, store, first, 100, asset, expense)
	postCashEntry(t, store, second, 200, asset, expense)
	postCashEntry(t, store, third, 300, asset, expense)
	postCashEntry(t, store, third, 400, asset, expense)

	tests := []struct {
		name   string
		filter entity.EntryFilter
		want   []string
	}{
		{
			name: "one account walks its own balance, newest first",
			filter: entity.EntryFilter{
				AccountRefs: []string{asset.Ref},
				WithBalance: true,
				Limit:       10,
			},
			want: []string{"2026-02-03=-1000", "2026-02-03=-600", "2026-02-02=-300", "2026-02-01=-100"},
		},
		{
			name:   "no account filter leaves the balance out",
			filter: entity.EntryFilter{WithBalance: true, Limit: 10},
			want:   []string{"2026-02-03", "2026-02-03", "2026-02-02", "2026-02-01"},
		},
		{
			name: "two accounts leave the balance out",
			filter: entity.EntryFilter{
				AccountRefs: []string{asset.Ref, expense.Ref},
				WithBalance: true,
				Limit:       10,
			},
			want: []string{"2026-02-03", "2026-02-03", "2026-02-02", "2026-02-01"},
		},
		{
			name: "the flag is opt-in",
			filter: entity.EntryFilter{
				AccountRefs: []string{asset.Ref},
				Limit:       10,
			},
			want: []string{"2026-02-03", "2026-02-03", "2026-02-02", "2026-02-01"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			entries, err := store.ListEntries(t.Context(), tc.filter)
			if err != nil {
				t.Fatalf("list entries: %v", err)
			}

			if got := labelsOf(entries); !slices.Equal(got, tc.want) {
				t.Fatalf("entries = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestListEntriesRunningBalanceContinuesAcrossPages(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := t.Context()

	first := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	second := first.AddDate(0, 0, 1)

	postCashEntry(t, store, first, 100, asset, expense)
	postCashEntry(t, store, second, 200, asset, expense)
	last := postCashEntry(t, store, second, 300, asset, expense)

	pageSize := 2

	page, err := store.ListEntries(ctx, entity.EntryFilter{
		AccountRefs: []string{asset.Ref},
		WithBalance: true,
		Limit:       pageSize,
	})
	if err != nil {
		t.Fatalf("first page: %v", err)
	}

	if len(page) != pageSize+1 {
		t.Fatalf("first page rows = %d, want limit + 1", len(page))
	}

	kept := page[:pageSize]
	if got := labelsOf(kept); !slices.Equal(got, []string{"2026-02-02=-600", "2026-02-02=-300"}) {
		t.Fatalf("first page = %v", got)
	}

	if kept[0].ID != last.ID {
		t.Fatal("the page did not start at the newest entry")
	}

	next, err := store.ListEntries(ctx, entity.EntryFilter{
		AccountRefs: []string{asset.Ref},
		WithBalance: true,
		Cursor:      kept[len(kept)-1].Ref,
		Limit:       pageSize,
	})
	if err != nil {
		t.Fatalf("second page: %v", err)
	}

	if got := labelsOf(next); !slices.Equal(got, []string{"2026-02-01=-100"}) {
		t.Fatalf("second page = %v", got)
	}
}

func TestRunningBalanceCheckpointShiftsBackdatedEntry(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	asset, expense := baseline(t, store)

	first := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	postCashEntry(t, store, first, 100, asset, expense)
	postCashEntry(t, store, first.AddDate(0, 0, 2), 200, asset, expense)
	postCashEntry(t, store, first.AddDate(0, 0, 1), 50, asset, expense)

	entries, err := store.ListEntries(t.Context(), entity.EntryFilter{
		AccountRefs: []string{asset.Ref},
		WithBalance: true,
		Limit:       10,
	})
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}

	// the register reads in the order the days happened, not the order the rows arrived
	want := []string{"2026-02-03=-350", "2026-02-02=-150", "2026-02-01=-100"}
	if got := labelsOf(entries); !slices.Equal(got, want) {
		t.Fatalf("entries = %v, want %v", got, want)
	}

	var dirty bool
	if err := store.DB().QueryRowContext(t.Context(),
		`SELECT balance_dirty FROM accounts WHERE ref = ?`, asset.Ref).Scan(&dirty); err != nil {
		t.Fatalf("account balance state: %v", err)
	}
	if dirty {
		t.Fatal("the checkpoint was left dirty after a normal insert")
	}
}

func TestRunningBalanceCheckpointIncludesReverseReversal(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	asset, expense := baseline(t, store)

	first := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	original := postCashEntry(t, store, first, 100, asset, expense)
	postCashEntry(t, store, first.AddDate(0, 0, 1), 200, asset, expense)

	if _, err := store.ReverseEntry(t.Context(), original.Ref, "corrected",
		first.AddDate(0, 0, 3)); err != nil {
		t.Fatalf("reverse entry: %v", err)
	}

	entries, err := store.ListEntries(t.Context(), entity.EntryFilter{
		AccountRefs: []string{asset.Ref},
		WithBalance: true,
		Limit:       10,
	})
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}

	// the days descend, and two rows on the same day fall back to insertion order
	want := []string{
		"2026-02-02=-200",
		"2026-02-01=0",
		"2026-02-01=-100",
	}
	if got := labelsOf(entries); !slices.Equal(got, want) {
		t.Fatalf("entries = %v, want %v", got, want)
	}
}

func TestRunningBalanceRebuildGivesEachCheckpointARef(t *testing.T) {
	t.Parallel()

	store := newStore(t)
	asset, expense := baseline(t, store)

	first := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	postCashEntry(t, store, first, 100, asset, expense)
	postCashEntry(t, store, first.AddDate(0, 0, 2), 200, asset, expense)
	postCashEntry(t, store, first.AddDate(0, 0, 1), 50, asset, expense)

	if _, err := store.DB().ExecContext(t.Context(),
		`UPDATE accounts SET balance_dirty = 1 WHERE ref = ?`, asset.Ref); err != nil {
		t.Fatalf("mark dirty: %v", err)
	}

	entries, err := store.ListEntries(t.Context(), entity.EntryFilter{
		AccountRefs: []string{asset.Ref},
		WithBalance: true,
		Limit:       10,
	})
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}

	// day order, not insertion order: the rebuild keeps the register's contract
	want := []string{"2026-02-03=-350", "2026-02-02=-150", "2026-02-01=-100"}
	if got := labelsOf(entries); !slices.Equal(got, want) {
		t.Fatalf("entries = %v, want %v", got, want)
	}

	var rows, refs int
	if err := store.DB().QueryRowContext(t.Context(),
		`SELECT COUNT(*), COUNT(DISTINCT ref) FROM entry_balances WHERE account_ref = ?`,
		asset.Ref).Scan(&rows, &refs); err != nil {
		t.Fatalf("checkpoint refs: %v", err)
	}
	if rows != 3 || refs != 3 {
		t.Fatalf("checkpoints = %d rows with %d refs, want 3 and 3", rows, refs)
	}
}

func TestAPostedEntryKeepsTheRateItWasPostedWith(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	cash, err := store.CreateAccount(ctx, "Cash", constant.AccountKindAsset, "USD")
	if err != nil {
		t.Fatalf("cash account: %v", err)
	}

	coffee, err := store.CreateAccount(ctx, "Coffee", constant.AccountKindExpense, "IDR")
	if err != nil {
		t.Fatalf("coffee account: %v", err)
	}

	day := time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC)

	entry, err := entity.NewEntry(entity.Entry{
		OccurredOn: day,
		Currency:   "USD",
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{
				AccountRef: cash.Ref, AmountMinor: -1, BaseAmountMinor: -16200,
				FXRate: "16200", FXRateDate: "2026-02-14", FXSource: constant.FXSourceManual,
			},
			{AccountRef: coffee.Ref, AmountMinor: 1, BaseAmountMinor: 16200},
		},
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	posted, err := store.InsertEntry(ctx, entry)
	if err != nil {
		t.Fatalf("insert entry: %v", err)
	}

	republishTheSheet(t, store)
	assertStoredRate(t, store, posted.Ref, cash.Ref)
}

func republishTheSheet(t *testing.T, store *sqlite.Store) {
	t.Helper()

	// The sheet moves the next day at a different rate. A locked entry must not move.
	if _, err := store.DB().ExecContext(t.Context(), `
		INSERT INTO fx_rates (ref, base, quote, on_date, rate, source, fetched_at)
		VALUES (?, 'EUR', 'USD', '2026-02-14', '1.2000', 'ecb', ?)`,
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", time.Now().UTC().Format(constant.TimestampLayout),
	); err != nil {
		t.Fatalf("publish the sheet: %v", err)
	}
}

func assertStoredRate(t *testing.T, store *sqlite.Store, entryRef, accountRef string) {
	t.Helper()

	reloaded, found, err := store.EntryByRef(t.Context(), entryRef)
	if err != nil || !found {
		t.Fatalf("read entry: found=%v err=%v", found, err)
	}

	for _, posting := range reloaded.Postings {
		if posting.AccountRef != accountRef {
			continue
		}

		if posting.FXRate != "16200" || posting.FXSource != constant.FXSourceManual {
			t.Fatalf("stored rate = %q/%q, want 16200/manual: the entry is the source of truth",
				posting.FXRate, posting.FXSource)
		}

		if posting.FXRateDate != "2026-02-14" {
			t.Fatalf("stored fx_rate_date = %q, want the posting day", posting.FXRateDate)
		}

		return
	}

	t.Fatalf("no posting for account %s", accountRef)
}
