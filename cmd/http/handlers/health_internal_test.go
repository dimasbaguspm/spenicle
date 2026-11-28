package handlers

import (
	"path/filepath"
	"testing"
	"time"

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

// The probe answers two things and nothing else: that the store replied, and which build replied.
func TestHealthAnswersAPing(t *testing.T) {
	store := newHealthStore(t)

	server := New(Deps{
		Health:        store,
		Version:       "v1+abc1234",
		StartedAt:     time.Now().UTC(),
		HealthTimeout: time.Second,
	})

	got, err := server.health(t.Context())
	if err != nil {
		t.Fatalf("health: %v", err)
	}

	if got.Status != "ok" {
		t.Fatalf("status = %q, want ok", got.Status)
	}

	if got.Version != "v1+abc1234" {
		t.Fatalf("version = %q, want v1+abc1234", got.Version)
	}
}

func TestHealthDegradesWhenTheStoreIsClosed(t *testing.T) {
	store := newHealthStore(t)

	server := New(Deps{
		Health:        store,
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
