package sqlite_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// baseline covers what used to live in module/bootstrap: the first-boot
// invariants. They are the reason a fresh database is usable at all, so they are
// tested against a real file, not a mock.
func TestEnsureBaselineSeedsAndLocks(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	locked, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a")
	if err != nil {
		t.Fatalf("baseline: %v", err)
	}

	if locked != "IDR" {
		t.Fatalf("locked = %q, want IDR", locked)
	}

	count, err := store.CountAccounts(ctx)
	if err != nil {
		t.Fatalf("count accounts: %v", err)
	}

	if count != 2 {
		t.Fatalf("accounts = %d, want the two seeds", count)
	}

	for _, want := range []struct{ name, kind string }{
		{constant.SeedAssetAccount, constant.AccountKindAsset},
		{constant.SeedExpenseAccount, constant.AccountKindExpense},
	} {
		if _, found, findErr := store.FindAccount(ctx, want.name, want.kind); findErr != nil || !found {
			t.Fatalf("seed %q (%s) missing: found=%v err=%v", want.name, want.kind, found, findErr)
		}
	}

	if finger, found, err := store.Setting(ctx, constant.SettingSecretFingerprint); err != nil ||
		!found || finger != "fingerprint-a" {
		t.Fatalf("fingerprint = %q found=%v err=%v", finger, found, err)
	}
}

func TestEnsureBaselineIsIdempotent(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a"); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a"); err != nil {
		t.Fatalf("second baseline: %v", err)
	}

	count, err := store.CountAccounts(ctx)
	if err != nil {
		t.Fatalf("count accounts: %v", err)
	}

	if count != 2 {
		t.Fatalf("accounts = %d, want no duplicates", count)
	}
}

func TestEnsureBaselineRefusesToChangeCurrency(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-a"); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.EnsureBaseline(t.Context(), "USD", "fingerprint-a"); err == nil {
		t.Fatal("changing the base currency must fail")
	}
}

func TestEnsureBaselineRefusesForeignSecret(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-a"); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-b"); err == nil {
		t.Fatal("a different APP_SECRET fingerprint must fail")
	}
}

func TestEnsureBaselineRejectsUnknownCurrency(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "RUPIAH", "fingerprint-a"); err == nil {
		t.Fatal("a non ISO 4217 base currency must fail")
	}
}
