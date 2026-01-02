package configs

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
}

// Connect establishes a connection to the database
func (dbConfig *Database) Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		logger.Log().Error("Unable to create connection pool", "error", err)
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
