package configs

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	env Environment
}

func NewDatabase(env Environment) Database {
	return Database{
		env,
	}
}

func (db Database) Connect(ctx context.Context) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, db.env.DatabaseURL)
	if err != nil {
		slog.Info("Unable to create pool connection")
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		slog.Info("Db is unreachable")
		pool.Close()
		return nil, err
	}

	return pool, nil
}
