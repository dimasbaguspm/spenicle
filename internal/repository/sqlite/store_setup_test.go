package sqlite_test

import (
	"errors"
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

	if balances[accounts.cash.Ref] != 125_000 || balances[accounts.card.Ref] != -50_000 || balances[accounts.opening.Ref] != -75_000 {
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
