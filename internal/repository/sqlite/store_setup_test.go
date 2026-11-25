package sqlite_test

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type openingAccountSet struct {
	opening entity.Account
	cash    entity.Account
	card    entity.Account
}

func TestCompleteSetupWritesBalancesAndLocksTheLedger(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()
	baseline(t, store)

	if _, err := store.CreateSetting(ctx, constant.SettingAppSettings, "old-settings"); err != nil {
		t.Fatalf("seed settings: %v", err)
	}

	setup := newOpeningSetup(t, []entity.OpeningAccount{
		{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 125_000},
		{Name: "Card", Kind: constant.AccountKindLiability, AmountMinor: -50_000},
	})
	if err := store.CompleteSetup(ctx, setup, "old-settings", "new-settings"); err != nil {
		t.Fatalf("complete setup: %v", err)
	}

	assertOpeningEntries(t, store)
	accounts := assertOpeningAccounts(t, store)
	assertOpeningBalances(t, store, accounts)
	assertSetupSettings(t, store)

	if err := store.CompleteSetup(ctx, setup, "new-settings", "other-settings"); !errors.Is(err, entity.ErrBaseCurrencyLocked) {
		t.Fatalf("second setup error = %v, want ErrBaseCurrencyLocked", err)
	}
}

func TestCompleteSetupRollsBackOnConflict(t *testing.T) {
	tests := []struct {
		name     string
		expected string
		archive  bool
		wantErr  error
	}{
		{name: "stale settings", expected: "stale", wantErr: entity.ErrSetupConflict},
		{name: "archived account", expected: "old-settings", archive: true, wantErr: entity.ErrInvalidState},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newStore(t)
			prepareSetupConflict(t, store, test.archive)
			setup := newOpeningSetup(t, []entity.OpeningAccount{
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 100},
			})

			assertSetupConflict(t, store, setup, test.expected, test.wantErr)
		})
	}
}

func TestEquityMigrationPreservesPopulatedRelationships(t *testing.T) {
	db := openV3Database(t)
	applyV3Schema(t, db)
	seedV3Relationships(t, db)

	assertEquityMigration(t, db)
}

func newOpeningSetup(t *testing.T, accounts []entity.OpeningAccount) entity.Setup {
	t.Helper()

	day := time.Date(2026, time.February, 14, 0, 0, 0, 0, time.UTC)
	setup, err := entity.NewSetup("USD", accounts, day)
	if err != nil {
		t.Fatalf("new setup: %v", err)
	}

	return setup
}

func assertOpeningEntries(t *testing.T, store *sqlite.Store) {
	t.Helper()

	entries, err := store.ListEntries(t.Context(), entity.EntryFilter{})
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("entries = %d, want 2", len(entries))
	}

	for _, entry := range entries {
		if entry.Source != constant.EntrySourceAdjustment {
			t.Fatalf("source = %q, want adjustment", entry.Source)
		}

		if err := entity.CheckZeroSum(entry.Postings); err != nil {
			t.Fatalf("opening entry is unbalanced: %v", err)
		}
	}
}

func assertOpeningAccounts(t *testing.T, store *sqlite.Store) openingAccountSet {
	t.Helper()

	ctx := t.Context()
	accounts, err := store.ListAccounts(ctx, entity.AccountFilter{})
	if err != nil {
		t.Fatalf("list accounts: %v", err)
	}

	if len(accounts) != 4 {
		t.Fatalf("accounts = %d, want 4", len(accounts))
	}

	opening, found, err := store.FindAccount(ctx, constant.OpeningAccountName, constant.AccountKindEquity)
	if err != nil || !found {
		t.Fatalf("opening account: found=%v err=%v", found, err)
	}

	if opening.Currency != "USD" {
		t.Fatalf("opening currency = %q, want USD", opening.Currency)
	}

	cash, found, err := store.FindAccount(ctx, "Cash", constant.AccountKindAsset)
	if err != nil || !found {
		t.Fatalf("cash: found=%v err=%v", found, err)
	}

	card, found, err := store.FindAccount(ctx, "Card", constant.AccountKindLiability)
	if err != nil || !found {
		t.Fatalf("card: found=%v err=%v", found, err)
	}

	return openingAccountSet{opening: opening, cash: cash, card: card}
}

func assertOpeningBalances(t *testing.T, store *sqlite.Store, accounts openingAccountSet) {
	t.Helper()

	balances, err := store.BalancesByAccount(t.Context())
	if err != nil {
		t.Fatalf("balances: %v", err)
	}

	if balances[accounts.cash.ID] != 125_000 || balances[accounts.card.ID] != -50_000 || balances[accounts.opening.ID] != -75_000 {
		t.Fatalf("opening balances = %v", balances)
	}
}

func assertSetupSettings(t *testing.T, store *sqlite.Store) {
	t.Helper()

	ctx := t.Context()
	stored, found, err := store.Setting(ctx, constant.SettingAppSettings)
	if err != nil || !found || stored != "new-settings" {
		t.Fatalf("settings: found=%v value=%q err=%v", found, stored, err)
	}

	if _, found, err := store.Setting(ctx, constant.SettingSetupCompletedAt); err != nil || !found {
		t.Fatalf("setup marker: found=%v err=%v", found, err)
	}
}

func prepareSetupConflict(t *testing.T, store *sqlite.Store, archive bool) {
	t.Helper()

	ctx := t.Context()
	cash, _ := baseline(t, store)
	if _, err := store.CreateSetting(ctx, constant.SettingAppSettings, "old-settings"); err != nil {
		t.Fatalf("seed settings: %v", err)
	}

	if archive {
		now := time.Now().UTC()
		cash.ArchivedAt = &now
		if _, err := store.UpdateAccount(ctx, cash); err != nil {
			t.Fatalf("archive account: %v", err)
		}
	}
}

func assertSetupConflict(t *testing.T, store *sqlite.Store, setup entity.Setup, expected string, wantErr error) {
	t.Helper()

	ctx := t.Context()
	if err := store.CompleteSetup(ctx, setup, expected, "new-settings"); !errors.Is(err, wantErr) {
		t.Fatalf("error = %v, want %v", err, wantErr)
	}

	assertSetupRolledBack(t, store)
}

func assertSetupRolledBack(t *testing.T, store *sqlite.Store) {
	t.Helper()

	ctx := t.Context()
	entries, err := store.ListEntries(ctx, entity.EntryFilter{})
	if err != nil || len(entries) != 0 {
		t.Fatalf("entries after rollback: %d err=%v", len(entries), err)
	}

	if _, found, err := store.Setting(ctx, constant.SettingSetupCompletedAt); err != nil || found {
		t.Fatalf("setup marker after rollback: found=%v err=%v", found, err)
	}

	if value, found, err := store.Setting(ctx, constant.SettingAppSettings); err != nil || !found || value != "old-settings" {
		t.Fatalf("settings after rollback: found=%v value=%q err=%v", found, value, err)
	}
}

func openV3Database(t *testing.T) *sql.DB {
	t.Helper()

	path := filepath.Join(t.TempDir(), "v3.db")
	db, err := sqlite.Open(t.Context(), sqlite.Config{Path: path})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	return db
}

func applyV3Schema(t *testing.T, db *sql.DB) {
	t.Helper()

	for _, name := range []string{"0001_init.sql", "0002_categorization_rules.sql", "0003_export_window.sql"} {
		applyV3MigrationFile(t, db, name)
	}
}

func applyV3MigrationFile(t *testing.T, db *sql.DB, name string) {
	t.Helper()

	ctx := t.Context()
	body, err := os.ReadFile(filepath.Join("migrations", name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}

	for _, statement := range strings.Split(string(body), ";") {
		if strings.TrimSpace(statement) != "" {
			if _, err := db.ExecContext(ctx, statement); err != nil {
				t.Fatalf("apply %s: %v", name, err)
			}
		}
	}
}

func seedV3Relationships(t *testing.T, db *sql.DB) {
	t.Helper()

	statements := []string{
		`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
		`INSERT INTO schema_migrations (version, applied_at) VALUES (1, '2026-01-01T00:00:00Z'), (2, '2026-01-01T00:00:00Z'), (3, '2026-01-01T00:00:00Z')`,
		`INSERT INTO accounts (ref, name, kind, currency, created_at) VALUES ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Cash', 'asset', 'USD', '2026-01-01T00:00:00Z')`,
		`INSERT INTO accounts (ref, name, kind, parent_id, currency, created_at) VALUES ('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Wallet', 'asset', 1, 'USD', '2026-01-01T00:00:00Z')`,
		`INSERT INTO payees (ref, name, default_account_id, created_at) VALUES ('cccccccccccccccccccccccccccccccc', 'Shop', 2, '2026-01-01T00:00:00Z')`,
		`INSERT INTO ledger_entries (ref, occurred_on, payee_id, currency, source, created_at) VALUES ('dddddddddddddddddddddddddddddddd', '2026-01-02', 1, 'USD', 'manual', '2026-01-02T00:00:00Z')`,
		`INSERT INTO ledger_postings (ref, entry_id, account_id, amount_minor, base_amount_minor, fx_source) VALUES ('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 1, 2, 100, 100, 'identity'), ('ffffffffffffffffffffffffffffffff', 1, 1, -100, -100, 'identity')`,
	}

	for _, statement := range statements {
		if _, err := db.ExecContext(t.Context(), statement); err != nil {
			t.Fatalf("seed v3: %v", err)
		}
	}
}

func assertEquityMigration(t *testing.T, db *sql.DB) {
	t.Helper()

	if err := sqlite.Migrate(t.Context(), db); err != nil {
		t.Fatalf("migrate v3: %v", err)
	}

	assertNoForeignKeyViolations(t, db)
	assertMigratedRelationships(t, db)
}

func assertNoForeignKeyViolations(t *testing.T, db *sql.DB) {
	t.Helper()

	rows, err := db.QueryContext(t.Context(), `PRAGMA foreign_key_check`)
	if err != nil {
		t.Fatalf("foreign key check: %v", err)
	}

	defer func() { _ = rows.Close() }()

	if rows.Next() {
		t.Fatal("the migrated database has a foreign key violation")
	}

	if err := rows.Err(); err != nil {
		t.Fatalf("iterate foreign key check: %v", err)
	}
}

func assertMigratedRelationships(t *testing.T, db *sql.DB) {
	t.Helper()

	ctx := t.Context()
	var parentID int
	if err := db.QueryRowContext(ctx, `SELECT parent_id FROM accounts WHERE name = 'Wallet'`).Scan(&parentID); err != nil || parentID != 1 {
		t.Fatalf("parent id = %d err=%v", parentID, err)
	}

	if _, err := db.ExecContext(ctx,
		`INSERT INTO accounts (ref, name, kind, currency, created_at) VALUES ('11111111111111111111111111111111', 'Opening balance', 'equity', 'USD', '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatalf("insert equity account: %v", err)
	}

	var foreignKeys int
	if err := db.QueryRowContext(ctx, `PRAGMA foreign_keys`).Scan(&foreignKeys); err != nil || foreignKeys != 1 {
		t.Fatalf("foreign keys = %d err=%v", foreignKeys, err)
	}

	version, err := sqlite.NewStore(db).SchemaVersion(ctx)
	if err != nil || version != 4 {
		t.Fatalf("schema version = %d err=%v", version, err)
	}
}
