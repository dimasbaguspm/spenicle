package database

import (
	"context"
	"fmt"
	"log"

	"github.com/dimasbaguspm/spenicle-api/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	Env  *config.Environment
	Conn *pgxpool.Pool
}

// Connect establishes a connection to the database
func (dbConfig *Database) Connect() *pgxpool.Pool {
	connPool, err := pgxpool.New(context.Background(), dbConfig.Env.DatabaseURL)
	if err != nil {
		log.Panic("Unable to connect to database:", err)
	}

	err = connPool.Ping(context.Background())
	if err != nil {
		log.Panic("Unable to ping database:", err)
	}

	fmt.Println("Database connection pool established successfully")

	dbConfig.Conn = connPool
	return connPool
}

func (dbConfig *Database) Close() {
	if dbConfig.Conn != nil {
		dbConfig.Conn.Close()
	}
}

// NewPool creates a pgxpool.Pool from a connection string. Caller must close the pool.
func NewPool(ctx context.Context, connString string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
