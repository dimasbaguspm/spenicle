package configs

import (
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigration(env Environment) error {
	migrator, err := migrate.New(fmt.Sprintf("file://%s", filepath.Clean("migrations")), env.DatabaseURL)

	if err != nil {
		slog.Error("Something wrong with migrator", "error", err)
		return err
	}

	defer migrator.Close()
	if err := migrator.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}

		slog.Error("Unable to run migration", "error", err)
		return err
	}

	return nil
}
