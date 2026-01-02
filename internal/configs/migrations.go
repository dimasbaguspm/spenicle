package configs

import (
	"errors"
	"fmt"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// Migration handles database schema migrations
type Migration struct {
	databaseURL string
}

// NewMigration creates a new Migration instance
func New(databaseURL string) *Migration {
	return &Migration{
		databaseURL: databaseURL,
	}
}

// Up runs all pending migrations
func (m *Migration) Up() error {
	migrator, err := migrate.New(
		fmt.Sprintf("file://%s", filepath.Clean("internal/database/migrations")),
		m.databaseURL,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}
	defer migrator.Close()

	// Run all pending migrations
	if err := migrator.Up(); err != nil {
		// migrate.ErrNoChange means no migrations to run (DB is up to date)
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// Down rolls back the last migration
func (m *Migration) Down() error {
	migrator, err := migrate.New(
		fmt.Sprintf("file://%s", filepath.Clean("internal/database/migrations")),
		m.databaseURL,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}
	defer migrator.Close()

	if err := migrator.Down(); err != nil {
		return fmt.Errorf("failed to rollback migration: %w", err)
	}

	return nil
}

// Version returns the current migration version
func (m *Migration) Version() (uint, bool, error) {
	migrator, err := migrate.New(
		fmt.Sprintf("file://%s", filepath.Clean("internal/database/migrations")),
		m.databaseURL,
	)
	if err != nil {
		return 0, false, fmt.Errorf("failed to create migrator: %w", err)
	}
	defer migrator.Close()

	version, dirty, err := migrator.Version()
	if err != nil {
		return 0, false, fmt.Errorf("failed to get version: %w", err)
	}

	return version, dirty, nil
}
