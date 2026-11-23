package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	sqlite3 "modernc.org/sqlite"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

type Config struct {
	Path         string
	MaxOpenConns int
	MaxIdleConns int
}

const (
	dataDirPerm  = 0o750
	maxOpenConns = 4
	maxIdleConns = 2

	openAttempts = 10
	openBackoff  = 200 * time.Millisecond
)

const (
	sqliteBusy   = 5
	sqliteLocked = 6
)

func pickMax(want, fallback int) int {
	if want > 0 {
		return want
	}

	return fallback
}

func Open(ctx context.Context, cfg Config) (*sql.DB, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Open")
	defer endSpan()

	if err := os.MkdirAll(filepath.Dir(cfg.Path), dataDirPerm); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	dsn := "file:" + url.PathEscape(cfg.Path) +
		"?_pragma=busy_timeout(5000)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=foreign_keys(1)" +
		"&_pragma=synchronous(NORMAL)" +
		"&_txlock=immediate"

	db, err := openWithRetry(ctx, dsn, cfg)
	if err != nil {
		return nil, err
	}

	return db, nil
}

func openWithRetry(ctx context.Context, dsn string, cfg Config) (*sql.DB, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.OpenWithRetry")
	defer endSpan()

	var locked error

	for attempt := range openAttempts {
		if attempt > 0 {
			timer := time.NewTimer(openBackoff)

			select {
			case <-ctx.Done():
				timer.Stop()

				return nil, fmt.Errorf("open sqlite: %w", ctx.Err())
			case <-timer.C:
			}
		}

		db, err := connect(ctx, dsn, cfg)
		if err == nil {
			return db, nil
		}

		if !isLocked(err) {
			return nil, err
		}

		telemetry.RecordSQLiteLocked(ctx)

		locked = err
	}

	return nil, fmt.Errorf("sqlite stayed locked after %d attempts: %w", openAttempts, locked)
}

func connect(ctx context.Context, dsn string, cfg Config) (*sql.DB, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Connect")
	defer endSpan()

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	db.SetMaxOpenConns(pickMax(cfg.MaxOpenConns, maxOpenConns))
	db.SetMaxIdleConns(pickMax(cfg.MaxIdleConns, maxIdleConns))

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()

		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}

func isLocked(err error) bool {
	var driverErr *sqlite3.Error

	if !errors.As(err, &driverErr) {
		return false
	}

	return driverErr.Code() == sqliteBusy || driverErr.Code() == sqliteLocked
}
