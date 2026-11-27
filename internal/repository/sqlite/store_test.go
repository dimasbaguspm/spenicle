package sqlite_test

import (
	"errors"
	"fmt"
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

func TestConsolidatedSchemaCarriesEveryMergedChange(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	columns := []struct {
		table  string
		column string
	}{
		{table: "api_tokens", column: "expires_at"},
		{table: "exports", column: "from_on"},
		{table: "exports", column: "to_on"},
		{table: "import_rows", column: "currency"},
		{table: "capture_payloads", column: "capture_ref"},
		{table: "import_upload_chunks", column: "chunk_sha256"},
		{table: "categorization_rules", column: "account_ref"},
	}

	for _, column := range columns {
		t.Run(column.table+"."+column.column, func(t *testing.T) {
			var found int
			err := store.DB().QueryRowContext(ctx,
				fmt.Sprintf(`SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name = ?`, column.table),
				column.column,
			).Scan(&found)
			if err != nil {
				t.Fatalf("inspect %s.%s: %v", column.table, column.column, err)
			}
			if found != 1 {
				t.Fatalf("%s.%s is missing from the consolidated schema", column.table, column.column)
			}
		})
	}

	for _, index := range []string{
		"ux_rules_live", "ix_rules_account_ref", "ix_recurring_due",
		"ix_entries_reversal_ref", "ix_exports_expiry",
	} {
		t.Run(index, func(t *testing.T) {
			var found int
			err := store.DB().QueryRowContext(ctx,
				`SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = ?`, index,
			).Scan(&found)
			if err != nil {
				t.Fatalf("inspect index %s: %v", index, err)
			}
			if found != 1 {
				t.Fatalf("index %s is missing from the consolidated schema", index)
			}
		})
	}

	if _, err := store.CreateAccount(ctx, "Opening balance", constant.AccountKindEquity, "IDR"); err != nil {
		t.Fatalf("equity account: %v", err)
	}
}

func TestInsertEntryMapsClientIDConflictToDuplicate(t *testing.T) {
	store := newStore(t)
	asset, expense := baseline(t, store)
	ctx := t.Context()

	entry, err := entity.NewEntry(entity.Entry{
		ClientID:   "01924f7c-0000-7000-8000-000000000002",
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Source:     constant.EntrySourceManual,
		Postings: []entity.Posting{
			{AccountRef: expense.Ref, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountRef: asset.Ref, AmountMinor: -25_000, BaseAmountMinor: -25_000},
		},
	})
	if err != nil {
		t.Fatalf("new entry: %v", err)
	}

	if _, err := store.InsertEntry(ctx, entry); err != nil {
		t.Fatalf("first insert: %v", err)
	}

	replay := entry
	replay.ID = 0
	replay.Ref = ""
	if _, err := store.InsertEntry(ctx, replay); !errors.Is(err, entity.ErrDuplicate) {
		t.Fatalf("error = %v, want duplicate", err)
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
			{AccountRef: expense.Ref, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountRef: asset.Ref, AmountMinor: -25_000, BaseAmountMinor: -25_000},
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
			{AccountRef: expense.Ref, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountRef: asset.Ref, AmountMinor: -24_000, BaseAmountMinor: -24_000},
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
			{AccountRef: "00000000000000000000000000000000", AmountMinor: 100, BaseAmountMinor: 100},
			{AccountRef: "00000000000000000000000000000001", AmountMinor: -100, BaseAmountMinor: -100},
		},
	})
	if err == nil {
		t.Fatal("foreign key to a missing account must fail")
	}
}
