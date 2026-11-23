package sqlite_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

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

func TestEnsureBaselineRefusesForeignSecret(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-a"); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	_, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-b")
	if !errors.Is(err, entity.ErrSecretMismatch) {
		t.Fatalf("err = %v, want a secret mismatch", err)
	}

	if !strings.Contains(err.Error(), "fresh database") {
		t.Fatalf("the error must name the way out: %v", err)
	}
}

func TestEnsureBaselineRejectsUnknownCurrency(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "RUPIAH", "fingerprint-a"); err == nil {
		t.Fatal("a non ISO 4217 base currency must fail")
	}
}
