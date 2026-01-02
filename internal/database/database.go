package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
}

// Connect establishes a connection to the database
func (dbConfig *Database) Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
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
