package settings_test

import (
	"path/filepath"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func newService(t *testing.T) *settings.Service {
	t.Helper()

	db, err := sqlite.Open(t.Context(), sqlite.Config{Path: filepath.Join(t.TempDir(), "settings.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if migrateErr := sqlite.Migrate(t.Context(), db); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	return settings.New(sqlite.NewStore(db), sealer, clock.System{})
}

func TestEnsureInitialDefaultsToIDR(t *testing.T) {
	service := newService(t)

	seeded, err := service.EnsureInitial(t.Context(), "initial-password-123")
	if err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if seeded.BaseCurrency != "IDR" {
		t.Fatalf("base currency = %q, want IDR", seeded.BaseCurrency)
	}

	if !seeded.PasswordMustChange {
		t.Fatal("a generated password must be flagged for change")
	}

	loaded, err := service.Load(t.Context())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if loaded.BaseCurrency != "IDR" || loaded.Password != "initial-password-123" {
		t.Fatalf("loaded = %+v", loaded)
	}
}

func TestEnsureInitialIsIdempotent(t *testing.T) {
	service := newService(t)

	if _, err := service.EnsureInitial(t.Context(), "first-password-123"); err != nil {
		t.Fatalf("first: %v", err)
	}

	second, err := service.EnsureInitial(t.Context(), "second-password-123")
	if err != nil {
		t.Fatalf("second: %v", err)
	}

	if second.Password != "first-password-123" {
		t.Fatalf("password was regenerated: %q", second.Password)
	}
}

func TestSetBaseCurrencyIsLockedByTheFirstEntry(t *testing.T) {
	service := newService(t)

	if _, err := service.SetBaseCurrency(t.Context(), "usd"); err != nil {
		t.Fatalf("empty ledger must accept a currency: %v", err)
	}

	if got, _ := service.BaseCurrency(t.Context()); got != "USD" {
		t.Fatalf("base currency = %q, want USD", got)
	}

	if _, err := service.Load(t.Context()); err != nil {
		t.Fatalf("load: %v", err)
	}
}

func TestAuthenticateAndChangePassword(t *testing.T) {
	service := newService(t)

	if _, err := service.EnsureInitial(t.Context(), "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if _, _, err := service.Authenticate(t.Context(), "wrong-password-123"); err == nil {
		t.Fatal("a wrong password must fail")
	}

	changed, err := service.ChangePassword(t.Context(), "initial-password-123", "my-own-password-456")
	if err != nil {
		t.Fatalf("change: %v", err)
	}

	if changed.PasswordMustChange {
		t.Fatal("choosing your own password clears the flag")
	}

	if _, _, err := service.Authenticate(t.Context(), "my-own-password-456"); err != nil {
		t.Fatalf("new password must authenticate: %v", err)
	}
}

func TestChangePasswordRejectsShortPassword(t *testing.T) {
	service := newService(t)

	if _, err := service.EnsureInitial(t.Context(), "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	_, err := service.ChangePassword(t.Context(), "initial-password-123", "short")
	if err == nil {
		t.Fatal("a short password must be refused")
	}
}

func TestOpenModeHasNoPassword(t *testing.T) {
	service := newService(t)

	if _, err := service.EnsureInitial(t.Context(), ""); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	_, found, err := service.Authenticate(t.Context(), "")
	if err != nil {
		t.Fatalf("open mode must not error: %v", err)
	}

	if found {
		t.Fatal("open mode reports no password")
	}
}

func TestSettingsValidateRejectsUnknownCurrency(t *testing.T) {
	if err := (entity.Settings{BaseCurrency: "RUPIAH"}).Validate(); err == nil {
		t.Fatal("a non ISO 4217 currency must be refused")
	}
}
