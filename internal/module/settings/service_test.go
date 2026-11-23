package settings_test

import (
	"errors"
	"path/filepath"
	"strings"
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

func TestEnsureInitialDefaultsToIDRAndHashesThePassword(t *testing.T) {
	service := newService(t)

	seeded, created, err := service.EnsureInitial(t.Context(), "initial-password-123")
	if err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if !created {
		t.Fatal("a fresh database reports that the row was created")
	}

	if seeded.BaseCurrency != "IDR" {
		t.Fatalf("base currency = %q, want IDR", seeded.BaseCurrency)
	}

	if !seeded.PasswordMustChange {
		t.Fatal("a generated password must be flagged for change")
	}

	if !strings.HasPrefix(seeded.PasswordHash, "pbkdf2-sha256$") {
		t.Fatalf("password hash = %q, want the pbkdf2 envelope", seeded.PasswordHash)
	}

	if strings.Contains(seeded.PasswordHash, "initial-password-123") {
		t.Fatal("the plaintext password must never be stored")
	}
}

func TestEnsureInitialIsIdempotent(t *testing.T) {
	service := newService(t)

	first, _, err := service.EnsureInitial(t.Context(), "first-password-123")
	if err != nil {
		t.Fatalf("first: %v", err)
	}

	second, created, err := service.EnsureInitial(t.Context(), "second-password-123")
	if err != nil {
		t.Fatalf("second: %v", err)
	}

	if created {
		t.Fatal("the second boot must not create the row again")
	}

	if second.PasswordHash != first.PasswordHash {
		t.Fatalf("password was regenerated: %q -> %q", first.PasswordHash, second.PasswordHash)
	}
}

func TestAuthenticateVerifiesTheHash(t *testing.T) {
	service := newService(t)

	if _, _, err := service.EnsureInitial(t.Context(), "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if _, found, err := service.Authenticate(t.Context(), "initial-password-123"); err != nil || !found {
		t.Fatalf("the right password must authenticate: found=%v err=%v", found, err)
	}

	if _, _, err := service.Authenticate(t.Context(), "wrong-password-123"); !errors.Is(err, entity.ErrPasswordMismatch) {
		t.Fatalf("a wrong password must answer ErrPasswordMismatch, got %v", err)
	}
}

func TestChangePasswordRotatesTheSession(t *testing.T) {
	service := newService(t)
	ctx := t.Context()

	if _, _, err := service.EnsureInitial(ctx, "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	before, err := service.SessionToken(ctx)
	if err != nil {
		t.Fatalf("token before: %v", err)
	}

	changed, err := service.ChangePassword(ctx, "initial-password-123", "my-own-password-456")
	if err != nil {
		t.Fatalf("change: %v", err)
	}

	if changed.PasswordMustChange {
		t.Fatal("choosing your own password clears the flag")
	}

	after, err := service.SessionToken(ctx)
	if err != nil {
		t.Fatalf("token after: %v", err)
	}

	if before == after {
		t.Fatal("changing the password must invalidate every existing session")
	}

	if _, found, authErr := service.Authenticate(ctx, "my-own-password-456"); authErr != nil || !found {
		t.Fatalf("the new password must authenticate: found=%v err=%v", found, authErr)
	}

	if _, _, authErr := service.Authenticate(ctx, "initial-password-123"); !errors.Is(authErr, entity.ErrPasswordMismatch) {
		t.Fatalf("the old password must stop working, got %v", authErr)
	}
}

func TestSessionTokenIsStableForOnePassword(t *testing.T) {
	service := newService(t)
	ctx := t.Context()

	if _, _, err := service.EnsureInitial(ctx, "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	first, err := service.SessionToken(ctx)
	if err != nil {
		t.Fatalf("first token: %v", err)
	}

	second, err := service.SessionToken(ctx)
	if err != nil {
		t.Fatalf("second token: %v", err)
	}

	if first != second {
		t.Fatalf("the token must be stable across calls: %q vs %q", first, second)
	}
}

func TestChangePasswordRejectsShortPassword(t *testing.T) {
	service := newService(t)

	if _, _, err := service.EnsureInitial(t.Context(), "initial-password-123"); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	_, err := service.ChangePassword(t.Context(), "initial-password-123", "short")
	if !errors.Is(err, entity.ErrWeakPassword) {
		t.Fatalf("a short password must be refused, got %v", err)
	}
}

func TestOpenModeHasNoPassword(t *testing.T) {
	service := newService(t)

	if _, _, err := service.EnsureInitial(t.Context(), ""); err != nil {
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
