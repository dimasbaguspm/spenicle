package database

import (
	"context"
	"log"

	"github.com/dimasbaguspm/spenicle-api/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	Env *config.Environment
}

// Connect establishes a connection to the database
func (dbConfig *Database) Connect(ctx context.Context) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), dbConfig.Env.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
