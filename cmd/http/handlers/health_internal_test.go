package handlers

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func newHealthStore(t *testing.T) *sqlite.Store {
	t.Helper()

	db, err := sqlite.Open(t.Context(), sqlite.Config{
		Path: filepath.Join(t.TempDir(), "health.db"),
	})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if err := sqlite.Migrate(t.Context(), db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return sqlite.NewStore(db)
}

func newHealthSettings(t *testing.T, store *sqlite.Store, sealer seal.Sealer, currency string) *settings.Service {
	t.Helper()

	service := settings.New(store, sealer, clock.System{})
	if _, _, err := service.EnsureInitial(t.Context(), "health-password-1234", "UTC"); err != nil {
		t.Fatalf("initial settings: %v", err)
	}

	if currency != "IDR" {
		if _, err := service.Setup(t.Context(), currency, nil); err != nil {
			t.Fatalf("setup %s: %v", currency, err)
		}
	}

	return service
}

func TestHealthReportsTheProcessStart(t *testing.T) {
	startedAt := time.Date(2026, 4, 15, 9, 0, 0, 0, time.UTC)

	cases := []struct {
		name      string
		heartbeat string
		want      string
	}{
		{name: "a completed worker run", heartbeat: "2026-04-15T08:55:00Z", want: "2026-04-15T08:55:00Z"},
		{name: "no worker run yet", heartbeat: "", want: ""},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			store := newHealthStore(t)
			if testCase.heartbeat != "" {
				if err := store.SetSetting(t.Context(), constant.SettingWorkerLastRunAt,
					testCase.heartbeat); err != nil {
					t.Fatalf("set heartbeat: %v", err)
				}
			}

			sealer, err := seal.New("0123456789abcdef")
			if err != nil {
				t.Fatalf("sealer: %v", err)
			}

			server := New(Deps{
				Health:        store,
				Sealer:        sealer,
				Settings:      newHealthSettings(t, store, sealer, "IDR"),
				Timezone:      "UTC",
				Version:       "v1+abc1234",
				StartedAt:     startedAt,
				HealthTimeout: time.Second,
			})

			got, err := server.health(t.Context())
			if err != nil {
				t.Fatalf("health: %v", err)
			}

			if got.StartedAt != startedAt.Format(constant.TimestampLayout) {
				t.Fatalf("started_at = %q, want %q", got.StartedAt,
					startedAt.Format(constant.TimestampLayout))
			}
			if got.WorkerLastRunAt != testCase.want {
				t.Fatalf("worker_last_run_at = %q, want %q", got.WorkerLastRunAt, testCase.want)
			}
		})
	}
}

func TestHealthReadsTheBaseCurrencyFromSettings(t *testing.T) {
	cases := []struct {
		name     string
		currency string
	}{
		{name: "before setup", currency: "IDR"},
		{name: "after setup", currency: "USD"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			store := newHealthStore(t)
			sealer, err := seal.New("0123456789abcdef")
			if err != nil {
				t.Fatalf("sealer: %v", err)
			}

			server := New(Deps{
				Health:        store,
				Sealer:        sealer,
				Settings:      newHealthSettings(t, store, sealer, testCase.currency),
				Timezone:      "UTC",
				HealthTimeout: time.Second,
			})

			got, err := server.health(t.Context())
			if err != nil {
				t.Fatalf("health: %v", err)
			}
			if got.BaseCurrency != testCase.currency {
				t.Fatalf("base currency = %q, want %q", got.BaseCurrency, testCase.currency)
			}
		})
	}
}

func TestHealthDegradesWhenTheStoreIsClosed(t *testing.T) {
	store := newHealthStore(t)
	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	server := New(Deps{
		Health:        store,
		Sealer:        sealer,
		StartedAt:     time.Now().UTC(),
		HealthTimeout: time.Second,
	})

	if err := store.Close(t.Context()); err != nil {
		t.Fatalf("close store: %v", err)
	}

	if _, err := server.health(t.Context()); err == nil {
		t.Fatal("health on a closed store must fail")
	}
}
