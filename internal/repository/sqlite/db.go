package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite" // pure Go driver, keeps the binary static
)

// Config is everything the adapter needs to open a database.
type Config struct {
	Path string
}

const (
	// dataDirPerm keeps the SQLite file private to its process user.
	dataDirPerm = 0o750
	// maxOpenConns bounds the pool: one writer, a few readers.
	maxOpenConns = 4
	maxIdleConns = 2
)

// Open creates the data directory if needed and returns a WAL-mode handle.
func Open(ctx context.Context, cfg Config) (*sql.DB, error) {
	ctx, endSpan := startSpan(ctx, "Open")
	defer endSpan()

	if err := os.MkdirAll(filepath.Dir(cfg.Path), dataDirPerm); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	dsn := "file:" + url.PathEscape(cfg.Path) +
		"?_pragma=busy_timeout(5000)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=foreign_keys(1)" +
		"&_pragma=synchronous(NORMAL)"

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// WAL allows concurrent readers, but this deployment is one process with a
	// single writer. Fewer connections keeps BUSY retries predictable.
	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxIdleConns)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}
