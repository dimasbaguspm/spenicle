package sqlite_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// baseline covers what used to live in module/bootstrap: the first-boot
// invariants. They are the reason a fresh database is usable at all, so they are
// tested against a real file, not a mock.
func TestEnsureBaselineSeedsAndLocks(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	locked, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a", false)
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

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a", false); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a", false); err != nil {
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

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-a", false); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.EnsureBaseline(t.Context(), "USD", "fingerprint-a", false); err == nil {
		t.Fatal("changing the base currency must fail")
	}
}

func TestEnsureBaselineRefusesForeignSecret(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-a", false); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	_, err := store.EnsureBaseline(t.Context(), "IDR", "fingerprint-b", false)
	if !errors.Is(err, entity.ErrSecretMismatch) {
		t.Fatalf("err = %v, want a secret mismatch", err)
	}

	if !strings.Contains(err.Error(), "APP_SECRET_RESET") {
		t.Fatalf("the error must name the recovery: %v", err)
	}
}

// A changed APP_SECRET is unrecoverable for sealed data, so the recovery is
// explicit: blank the payloads, audit the reset, record the new fingerprint.
func TestEnsureBaselineResetDiscardsSealedPayloads(t *testing.T) {
	store := newStore(t)
	ctx := t.Context()

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-a", false); err != nil {
		t.Fatalf("first baseline: %v", err)
	}

	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO captures (kind, status, dedupe_key, raw_text, draft_json, received_at)
		VALUES ('image', 'pending', 'dedupe-1', 'sealed raw text', 'sealed draft', '2026-02-14T00:00:00Z')`,
	); err != nil {
		t.Fatalf("insert capture: %v", err)
	}

	if _, err := store.EnsureBaseline(ctx, "IDR", "fingerprint-b", true); err != nil {
		t.Fatalf("reset: %v", err)
	}

	finger, found, err := store.Setting(ctx, constant.SettingSecretFingerprint)
	if err != nil || !found || finger != "fingerprint-b" {
		t.Fatalf("fingerprint = %q found=%v err=%v, want the new one", finger, found, err)
	}

	var rawText *string

	var draftJSON *string

	if err := store.DB().QueryRowContext(ctx,
		`SELECT raw_text, draft_json FROM captures WHERE dedupe_key = 'dedupe-1'`,
	).Scan(&rawText, &draftJSON); err != nil {
		t.Fatalf("select capture: %v", err)
	}

	if rawText != nil || draftJSON != nil {
		t.Fatalf("sealed payloads survived the reset: %v %v", rawText, draftJSON)
	}

	var audited int
	if err := store.DB().QueryRowContext(ctx,
		`SELECT COUNT(*) FROM audit_log WHERE action = 'secret_reset'`,
	).Scan(&audited); err != nil {
		t.Fatalf("count audit: %v", err)
	}

	if audited != 1 {
		t.Fatalf("audit rows = %d, want exactly one secret_reset", audited)
	}
}

func TestEnsureBaselineRejectsUnknownCurrency(t *testing.T) {
	store := newStore(t)

	if _, err := store.EnsureBaseline(t.Context(), "RUPIAH", "fingerprint-a", false); err == nil {
		t.Fatal("a non ISO 4217 base currency must fail")
	}
}
