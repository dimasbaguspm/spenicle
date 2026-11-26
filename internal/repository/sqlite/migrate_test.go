package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func TestMigrateRefusesUnsupportedSchemaVersions(t *testing.T) {
	tests := []struct {
		name        string
		versions    []int
		wantErr     bool
		wantMessage string
	}{
		{name: "fresh database"},
		{name: "current version", versions: []int{1}},
		{
			name:     "older version",
			versions: []int{6},
			wantErr:  true,
			wantMessage: "unsupported schema version 6: this build has schema version 1 " +
				"and does not upgrade an existing database",
		},
		{
			name:        "mixed versions",
			versions:    []int{1, 6},
			wantErr:     true,
			wantMessage: "unsupported schema version 6",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctx := t.Context()
			db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "spenicle.db")})
			if err != nil {
				t.Fatalf("open: %v", err)
			}

			defer func() { _ = db.Close() }()

			seedMigrationVersions(ctx, t, db, tc.versions)

			err = sqlite.Migrate(ctx, db)
			if tc.wantErr {
				assertUnsupportedMigrationError(t, err, tc.wantMessage)

				return
			}

			if err != nil {
				t.Fatalf("migrate: %v", err)
			}

			assertMigrationState(ctx, t, db)
		})
	}
}

func seedMigrationVersions(ctx context.Context, t *testing.T, db *sql.DB, versions []int) {
	t.Helper()

	if len(versions) == 0 {
		return
	}

	if _, err := db.ExecContext(ctx,
		`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`); err != nil {
		t.Fatalf("create schema_migrations: %v", err)
	}

	for _, version := range versions {
		if _, err := db.ExecContext(ctx,
			`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
			version, "2026-01-01T00:00:00Z"); err != nil {
			t.Fatalf("record version %d: %v", version, err)
		}
	}
}

func assertUnsupportedMigrationError(t *testing.T, err error, wantMessage string) {
	t.Helper()

	if !errors.Is(err, sqlite.ErrUnsupportedSchema) {
		t.Fatalf("migrate error = %v, want unsupported schema", err)
	}

	if !strings.Contains(err.Error(), wantMessage) {
		t.Fatalf("migrate error = %q, want it to mention %q", err, wantMessage)
	}
}

func assertMigrationState(ctx context.Context, t *testing.T, db *sql.DB) {
	t.Helper()

	version, applied, err := migrateState(ctx, db)
	if err != nil {
		t.Fatalf("read migration state: %v", err)
	}

	if version != 1 || applied != 1 {
		t.Fatalf("migration state = %d/%d, want 1/1", version, applied)
	}
}

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
