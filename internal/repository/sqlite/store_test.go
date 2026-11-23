package sqlite_test

import (
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func newStore(t *testing.T) *sqlite.Store {
	t.Helper()

	db, err := sqlite.Open(t.Context(), sqlite.Config{Path: filepath.Join(t.TempDir(), "test.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	ctx := t.Context()
	if err := sqlite.Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return sqlite.NewStore(db)
}

func baseline(t *testing.T, store *sqlite.Store) (entity.Account, entity.Account) {
	t.Helper()
	ctx := t.Context()

	if err := store.SetSetting(ctx, constant.SettingSecretFingerprint, "fingerprint"); err != nil {
		t.Fatalf("set setting: %v", err)
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
	ctx := t.Context()

	v, err := store.SchemaVersion(ctx)
	if err != nil {
		t.Fatalf("schema version: %v", err)
	}
	if v != 1 {
		t.Fatalf("schema version = %d, want 1", v)
	}
}

func TestInsertEntryRoundTrip(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := t.Context()

	entry, err := entity.NewEntry(entity.Entry{
		ClientID:   "01924f7c-0000-7000-8000-000000000001",
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     constant.EntrySourceShare,
		Postings: []entity.Posting{
			{AccountID: expense.ID, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: asset.ID, AmountMinor: -25_000, BaseAmountMinor: -25_000},
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
	if back.Source != constant.EntrySourceShare {
		t.Fatalf("source = %q, want share", back.Source)
	}
	if len(back.Postings) != 2 {
		t.Fatalf("postings = %d, want 3", len(back.Postings))
	}
	if err := entity.CheckZeroSum(back.Postings); err != nil {
		t.Fatalf("stored postings do not balance: %v", err)
	}
}

func TestInsertEntryRejectsUnbalanced(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := t.Context()

	_, err := store.InsertEntry(ctx, entity.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{AccountID: expense.ID, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: asset.ID, AmountMinor: -24_000, BaseAmountMinor: -24_000},
		},
	})
	if !errors.Is(err, entity.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestInsertEntryRequiresExistingAccount(t *testing.T) {
	store := newStore(t)
	baseline(t, store)
	ctx := t.Context()

	_, err := store.InsertEntry(ctx, entity.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{AccountID: 999, AmountMinor: 100, BaseAmountMinor: 100},
			{AccountID: 998, AmountMinor: -100, BaseAmountMinor: -100},
		},
	})
	if err == nil {
		t.Fatal("foreign key to a missing account must fail")
	}
}
