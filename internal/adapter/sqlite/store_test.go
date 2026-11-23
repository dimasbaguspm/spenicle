package sqlite_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/adapter/sqlite"
	"github.com/dimasbaguspm/spenicle/internal/domain"
)

func newStore(t *testing.T) *sqlite.Store {
	t.Helper()

	db, err := sqlite.Open(context.Background(), sqlite.Config{Path: filepath.Join(t.TempDir(), "test.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	ctx := context.Background()
	if err := sqlite.Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return sqlite.NewStore(db)
}

func baseline(t *testing.T, store *sqlite.Store) (int64, int64) {
	t.Helper()
	ctx := context.Background()

	if err := store.SetSetting(ctx, "base_currency", "IDR"); err != nil {
		t.Fatalf("set base currency: %v", err)
	}
	asset, err := store.CreateAccount(ctx, "Cash", "asset", "IDR")
	if err != nil {
		t.Fatalf("asset account: %v", err)
	}
	expense, err := store.CreateAccount(ctx, "Coffee", "expense", "IDR")
	if err != nil {
		t.Fatalf("expense account: %v", err)
	}
	return asset, expense
}

func TestMigrateIsIdempotent(t *testing.T) {
	store := newStore(t)
	ctx := context.Background()

	v, err := store.SchemaVersion(ctx)
	if err != nil {
		t.Fatalf("schema version: %v", err)
	}
	if v != 1 {
		t.Fatalf("schema version = %d, want 1", v)
	}
	if _, err := store.Code(ctx); err == nil {
		t.Fatal("base currency should not exist before it is set")
	}
}

func TestInsertEntryRoundTrip(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := context.Background()

	entry, err := domain.NewEntry(domain.Entry{
		ClientID:   "01924f7c-0000-7000-8000-000000000001",
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     domain.SourceShare,
		Postings: []domain.Posting{
			{AccountID: expense, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: asset, AmountMinor: -25_000, BaseAmountMinor: -25_000},
		},
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	saved, err := store.InsertEntry(ctx, entry)
	if err != nil {
		t.Fatalf("insert: %v", err)
	}
	if saved.ID == 0 {
		t.Fatal("entry id was not assigned")
	}

	back, found, err := store.EntryByClientID(ctx, entry.ClientID)
	if err != nil {
		t.Fatalf("replay lookup: %v", err)
	}
	if !found {
		t.Fatal("entry not found by client id")
	}
	if back.Source != domain.SourceShare {
		t.Fatalf("source = %q, want share", back.Source)
	}
	if len(back.Postings) != 2 {
		t.Fatalf("postings = %d, want 2", len(back.Postings))
	}
	if err := domain.CheckZeroSum(back.Postings); err != nil {
		t.Fatalf("stored postings do not balance: %v", err)
	}
}

func TestInsertEntryRejectsUnbalanced(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := context.Background()

	_, err := store.InsertEntry(ctx, domain.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     domain.SourceManual,
		Postings: []domain.Posting{
			{AccountID: expense, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: asset, AmountMinor: -24_000, BaseAmountMinor: -24_000},
		},
	})
	if !errors.Is(err, domain.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestInsertEntryRequiresExistingAccount(t *testing.T) {
	store := newStore(t)
	baseline(t, store)
	ctx := context.Background()

	_, err := store.InsertEntry(ctx, domain.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     domain.SourceManual,
		Postings: []domain.Posting{
			{AccountID: 999, AmountMinor: 100, BaseAmountMinor: 100},
			{AccountID: 998, AmountMinor: -100, BaseAmountMinor: -100},
		},
	})
	if err == nil {
		t.Fatal("foreign key to a missing account must fail")
	}
}
