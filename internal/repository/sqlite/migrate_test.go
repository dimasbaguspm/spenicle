package sqlite_test

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"sync"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func TestMigrateSurvivesTwoHandlesAtOnce(t *testing.T) {
	path := filepath.Join(t.TempDir(), "spenicle.db")
	ctx := t.Context()

	first, err := sqlite.New(ctx, sqlite.Config{Path: path})
	if err != nil {
		t.Fatalf("open first handle: %v", err)
	}

	defer func() { _ = first.Close(ctx) }()

	second, err := sqlite.New(ctx, sqlite.Config{Path: path})
	if err != nil {
		t.Fatalf("open second handle: %v", err)
	}

	defer func() { _ = second.Close(ctx) }()

	start := make(chan struct{})
	errs := make(chan error, 2)

	var running sync.WaitGroup

	for _, db := range []*sql.DB{first.DB(), second.DB()} {
		running.Add(1)

		go func() {
			defer running.Done()

			<-start

			errs <- sqlite.Migrate(ctx, db)
		}()
	}

	close(start)
	running.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("concurrent migrate: %v", err)
		}
	}

	version, applied, err := migrateState(ctx, first.DB())
	if err != nil {
		t.Fatalf("read migration state: %v", err)
	}

	secondVersion, secondApplied, err := migrateState(ctx, second.DB())
	if err != nil {
		t.Fatalf("read migration state: %v", err)
	}

	if version != secondVersion || applied != secondApplied {
		t.Fatalf("handles disagree: %d/%d rows and %d/%d rows", version, applied, secondVersion, secondApplied)
	}

	if applied != version {
		t.Fatalf("schema_migrations holds %d rows for version %d: a version was applied twice or skipped",
			applied, version)
	}

	if version < 1 {
		t.Fatalf("schema version = %d, want the embedded migrations applied", version)
	}
}

func migrateState(ctx context.Context, db *sql.DB) (int, int, error) {
	var (
		version int
		applied int
	)

	err := db.QueryRowContext(ctx, `SELECT MAX(version), COUNT(*) FROM schema_migrations`).Scan(&version, &applied)
	if err != nil {
		return 0, 0, fmt.Errorf("migration state: %w", err)
	}

	return version, applied, nil
}
