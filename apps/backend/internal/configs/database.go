package configs

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
}

func NewDatabase(ctx context.Context, env Environment) *pgxpool.Pool {
	pool, err := pgxpool.New(ctx, env.DatabaseURL)

	if err != nil {
		slog.Info("Unable to create pool connection")
		os.Exit(1)
		return nil
	}

	slog.Info("Checking DB conection")
	if err := pool.Ping(ctx); err != nil {
		slog.Info("Db is unreachable")
		pool.Close()
		os.Exit(1)
		return nil
	}
	slog.Info("Database is in healthy condition")

	slog.Info("Running migration")
	runMigration(env)
	slog.Info("Migration success")

	return pool
}

func runMigration(env Environment) error {
	migrator, err := migrate.New(fmt.Sprintf("file://%s", filepath.Clean("migrations")), env.DatabaseURL)

	if err != nil {
		slog.Error("Something wrong with migrator", "error", err)
		os.Exit(1)
		return err
	}

	defer migrator.Close()

	if err := migrator.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			slog.Info("Migration is done, no changed schemas are detected")
			return nil
		}
		slog.Error("Unable to run migration", "error", err)
		return err
	}
	return nil
}
