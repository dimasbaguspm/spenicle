package settings_test

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func newService(t *testing.T) *settings.Service {
	t.Helper()

	service, _ := newServiceWithStore(t)

	return service
}

func newServiceWithStore(t *testing.T) (*settings.Service, *sqlite.Store) {
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

	store := sqlite.NewStore(db)

	return settings.New(store, sealer, clock.System{}), store
}

func TestEnsureInitialDefaultsToIDRAndHashesThePassword(t *testing.T) {
	service := newService(t)

	seeded, created, err := service.EnsureInitial(t.Context(), "initial-password-123", "")
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

	first, _, err := service.EnsureInitial(t.Context(), "first-password-123", "")
	if err != nil {
		t.Fatalf("first: %v", err)
	}

	second, created, err := service.EnsureInitial(t.Context(), "second-password-123", "")
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

	if _, _, err := service.EnsureInitial(t.Context(), "initial-password-123", ""); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if _, found, err := service.Authenticate(t.Context(), "initial-password-123"); err != nil || !found {
		t.Fatalf("the right password must authenticate: found=%v err=%v", found, err)
	}

	if _, _, err := service.Authenticate(t.Context(), "wrong-password-123"); !errors.Is(err, entity.ErrPasswordMismatch) {
		t.Fatalf("a wrong password must answer ErrPasswordMismatch, got %v", err)
	}
}

func TestChangePasswordInvalidatesTheOldCredential(t *testing.T) {
	service := newService(t)
	ctx := t.Context()

	if _, _, err := service.EnsureInitial(ctx, "initial-password-123", ""); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if ok, err := service.Root(ctx, "initial-password-123"); err != nil || !ok {
		t.Fatalf("the seeded password must be the root credential: ok=%v err=%v", ok, err)
	}

	changed, err := service.ChangePassword(ctx, "initial-password-123", "my-own-password-456")
	if err != nil {
		t.Fatalf("change: %v", err)
	}

	if changed.PasswordMustChange {
		t.Fatal("choosing your own password clears the flag")
	}

	if ok, err := service.Root(ctx, "initial-password-123"); err != nil || ok {
		t.Fatalf("the old password must stop working: ok=%v err=%v", ok, err)
	}

	if ok, err := service.Root(ctx, "my-own-password-456"); err != nil || !ok {
		t.Fatalf("the new password must be the root credential: ok=%v err=%v", ok, err)
	}
}

func TestRootAnswersOnlyTheInstancePassword(t *testing.T) {
	cases := []struct {
		name      string
		presented string
		want      bool
	}{
		{name: "the password itself", presented: "initial-password-123", want: true},
		{name: "a truncated password", presented: "initial-password-12", want: false},
		{name: "a blank credential", presented: "  ", want: false},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			service := newService(t)

			if _, _, err := service.EnsureInitial(t.Context(), "initial-password-123", ""); err != nil {
				t.Fatalf("ensure: %v", err)
			}

			// twice: the second call answers from the remembered digest
			for attempt := range 2 {
				ok, err := service.Root(t.Context(), testCase.presented)
				if err != nil {
					t.Fatalf("attempt %d: %v", attempt, err)
				}

				if ok != testCase.want {
					t.Fatalf("attempt %d: Root(%q) = %v, want %v",
						attempt, testCase.presented, ok, testCase.want)
				}
			}
		})
	}
}

func TestChangePasswordRejectsShortPassword(t *testing.T) {
	service := newService(t)

	if _, _, err := service.EnsureInitial(t.Context(), "initial-password-123", ""); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	_, err := service.ChangePassword(t.Context(), "initial-password-123", "short")
	if !errors.Is(err, entity.ErrWeakPassword) {
		t.Fatalf("a short password must be refused, got %v", err)
	}
}

func TestOpenModeHasNoPassword(t *testing.T) {
	service := newService(t)

	if _, _, err := service.EnsureInitial(t.Context(), "", ""); err != nil {
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

func TestEnsureTimezoneIsSetOnce(t *testing.T) {
	cases := []struct {
		name    string
		first   string
		second  string
		want    string
		wantErr bool
	}{
		{name: "the first boot pins the env value", first: "Asia/Jakarta", second: "", want: "Asia/Jakarta"},
		{name: "an empty env keeps the stored value", first: "", second: "", want: "UTC"},
		{name: "a different env refuses the boot", first: "UTC", second: "Asia/Jakarta", wantErr: true},
		{name: "the same env is not a change", first: "Asia/Jakarta", second: "Asia/Jakarta", want: "Asia/Jakarta"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			assertTimezonePinned(t, testCase.first, testCase.second, testCase.want, testCase.wantErr)
		})
	}
}

func assertTimezonePinned(t *testing.T, first, second, want string, wantErr bool) {
	t.Helper()

	service := newService(t)
	ctx := t.Context()

	if _, _, err := service.EnsureInitial(ctx, "", first); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	if _, err := service.EnsureTimezone(ctx, first); err != nil {
		t.Fatalf("first boot: %v", err)
	}

	pinned, err := service.EnsureTimezone(ctx, second)

	if wantErr {
		if !errors.Is(err, entity.ErrTimezoneSetOnce) {
			t.Fatalf("second boot error = %v, want ErrTimezoneSetOnce", err)
		}

		if !strings.Contains(err.Error(), "Asia/Jakarta") {
			t.Fatalf("error %q must name the env value", err)
		}

		return
	}

	if err != nil {
		t.Fatalf("second boot: %v", err)
	}

	if pinned.Timezone != want {
		t.Fatalf("timezone = %q, want %q", pinned.Timezone, want)
	}

	stored, err := service.Load(ctx)
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if stored.Timezone != want {
		t.Fatalf("stored timezone = %q, want %q", stored.Timezone, want)
	}
}

func TestSettingsAlwaysCarryATimezone(t *testing.T) {
	cases := []struct {
		name    string
		changed func(*entity.Settings)
		want    string
		wantErr bool
	}{
		{
			name:    "the default row is UTC",
			changed: func(*entity.Settings) {},
			want:    "UTC",
		},
		{
			name:    "an empty timezone is refused",
			changed: func(settings *entity.Settings) { settings.Timezone = "" },
			wantErr: true,
		},
		{
			name:    "an unknown IANA zone is refused",
			changed: func(settings *entity.Settings) { settings.Timezone = "Mars/Olympus" },
			wantErr: true,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			appSettings := entity.DefaultSettings()
			testCase.changed(&appSettings)

			err := appSettings.Validate()
			if testCase.wantErr {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}

				return
			}

			if err != nil {
				t.Fatalf("validate: %v", err)
			}

			if appSettings.Timezone != testCase.want {
				t.Fatalf("timezone = %q, want %q", appSettings.Timezone, testCase.want)
			}
		})
	}
}

func TestSetupPersistsCurrencyAndOpeningEntries(t *testing.T) {
	tests := []struct {
		name         string
		accounts     []entity.OpeningAccount
		wantEntries  int
		wantCurrency string
		wantErr      error
	}{
		{
			name:         "currency only stays compatible",
			wantCurrency: "USD",
		},
		{
			name: "opening accounts post balanced entries",
			accounts: []entity.OpeningAccount{
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 125_000},
				{Name: "Card", Kind: constant.AccountKindLiability, AmountMinor: -50_000},
			},
			wantEntries:  2,
			wantCurrency: "USD",
		},
		{
			name: "an invalid account rolls the setup back",
			accounts: []entity.OpeningAccount{
				{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 0},
			},
			wantErr: entity.ErrInvalidSetup,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			service, store := newSetupService(t)
			got, err := service.Setup(t.Context(), "usd", test.accounts)
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("setup error = %v, want %v", err, test.wantErr)
			}

			assertSetupEntryCount(t, store, test.wantEntries)
			if test.wantErr != nil {
				assertSetupRolledBack(t, store)

				return
			}

			assertSetupCurrencyLocked(t, service, got, test.wantCurrency)
		})
	}
}

func newSetupService(t *testing.T) (*settings.Service, *sqlite.Store) {
	t.Helper()

	service, store := newServiceWithStore(t)
	if _, _, err := service.EnsureInitial(t.Context(), "", ""); err != nil {
		t.Fatalf("ensure initial: %v", err)
	}

	return service, store
}

func assertSetupEntryCount(t *testing.T, store *sqlite.Store, want int) {
	t.Helper()

	entries, err := store.ListEntries(t.Context(), entity.EntryFilter{})
	if err != nil {
		t.Fatalf("list entries: %v", err)
	}

	if len(entries) != want {
		t.Fatalf("entries = %d, want %d", len(entries), want)
	}
}

func assertSetupRolledBack(t *testing.T, store *sqlite.Store) {
	t.Helper()

	if _, found, err := store.Setting(t.Context(), constant.SettingSetupCompletedAt); err != nil || found {
		t.Fatalf("failed setup left a marker: found=%v err=%v", found, err)
	}
}

func assertSetupCurrencyLocked(t *testing.T, service *settings.Service, got entity.Settings, want string) {
	t.Helper()

	if got.BaseCurrency != want {
		t.Fatalf("base currency = %q, want %q", got.BaseCurrency, want)
	}

	stored, err := service.Load(t.Context())
	if err != nil || stored.BaseCurrency != want {
		t.Fatalf("stored currency = %q err=%v", stored.BaseCurrency, err)
	}

	if _, err := service.Setup(t.Context(), "EUR", nil); !errors.Is(err, entity.ErrBaseCurrencyLocked) {
		t.Fatalf("second setup error = %v, want ErrBaseCurrencyLocked", err)
	}
}

func TestSetupDatesOpeningEntriesInTheConfiguredTimezone(t *testing.T) {
	service, store := newServiceWithStore(t)
	ctx := t.Context()
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}

	if _, _, ensureErr := service.EnsureInitial(ctx, "", location.String()); ensureErr != nil {
		t.Fatalf("ensure initial: %v", ensureErr)
	}

	before := time.Now().In(location).Format(constant.DateLayout)
	if _, setupErr := service.Setup(ctx, "IDR", []entity.OpeningAccount{
		{Name: "Cash", Kind: constant.AccountKindAsset, AmountMinor: 100_000},
	}); setupErr != nil {
		t.Fatalf("setup: %v", setupErr)
	}
	after := time.Now().In(location).Format(constant.DateLayout)

	entries, err := store.ListEntries(ctx, entity.EntryFilter{})
	if err != nil || len(entries) != 1 {
		t.Fatalf("entries = %d err=%v", len(entries), err)
	}

	got := entries[0].OccurredOn.Format(constant.DateLayout)
	if got != before && got != after {
		t.Fatalf("opening date = %q, want %q or %q", got, before, after)
	}
}

type movingClock struct{ at time.Time }

func (c *movingClock) Now() time.Time { return c.at }

func newServiceWithClock(t *testing.T, source settings.TimeSource) (*settings.Service, *sqlite.Store) {
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

	store := sqlite.NewStore(db)

	return settings.New(store, sealer, source), store
}

func rewriteStoredBaseCurrency(t *testing.T, service *settings.Service, store *sqlite.Store) {
	t.Helper()

	ctx := t.Context()
	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	current, err := service.Load(ctx)
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	current.BaseCurrency = "EUR"
	plain, err := json.Marshal(current)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	sealed, err := sealer.Seal(ctx, plain)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	if err := store.SetSetting(ctx, constant.SettingAppSettings, sealed); err != nil {
		t.Fatalf("write setting: %v", err)
	}
}

func TestLoadCachesForOneHourAndInvalidatesOnRequest(t *testing.T) {
	tests := []struct {
		name       string
		advance    time.Duration
		invalidate bool
		want       string
	}{
		{name: "a fresh cache serves the stored value", want: "IDR"},
		{name: "a fresh cache hides a direct store write", want: "IDR"},
		{name: "an expired cache reads the store again", advance: time.Hour, want: "EUR"},
		{name: "invalidating reads the store again", invalidate: true, want: "EUR"},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			ctx := t.Context()
			source := &movingClock{at: time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)}
			service, store := newServiceWithClock(t, source)

			if _, _, err := service.EnsureInitial(ctx, "", ""); err != nil {
				t.Fatalf("ensure: %v", err)
			}

			if _, err := service.Load(ctx); err != nil {
				t.Fatalf("prime cache: %v", err)
			}

			rewriteStoredBaseCurrency(t, service, store)

			source.at = source.at.Add(testCase.advance)

			if testCase.invalidate {
				service.InvalidateCache()
			}

			got, err := service.Load(ctx)
			if err != nil {
				t.Fatalf("load after change: %v", err)
			}

			if got.BaseCurrency != testCase.want {
				t.Fatalf("base currency = %q, want %q", got.BaseCurrency, testCase.want)
			}
		})
	}
}
