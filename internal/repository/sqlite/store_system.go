package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

func (s *Store) SchemaVersion(ctx context.Context) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SchemaVersion")
	defer endSpan()

	var v sql.NullInt64

	err := s.db.QueryRowContext(ctx, `SELECT MAX(version) FROM schema_migrations`).Scan(&v)
	if err != nil {
		return 0, fmt.Errorf("schema version: %w", err)
	}

	return int(v.Int64), nil
}

// Ping proves the file is writable, not merely readable.
func (s *Store) Ping(ctx context.Context) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Ping")
	defer endSpan()

	var one int
	if err := s.db.QueryRowContext(ctx, `SELECT 1`).Scan(&one); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	return nil
}

// Setting reads one configuration row.
func (s *Store) Setting(ctx context.Context, key string) (string, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Setting")
	defer endSpan()

	var v string

	err := s.db.QueryRowContext(ctx, `SELECT v FROM settings WHERE k = ?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf("setting %q: %w", key, err)
	}

	return v, true, nil
}

// SetSetting upserts one configuration row.
func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SetSetting")
	defer endSpan()

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO settings (k, v) VALUES (?, ?)
		ON CONFLICT (k) DO UPDATE SET v = excluded.v`, key, value)
	if err != nil {
		return fmt.Errorf("set setting %q: %w", key, err)
	}

	return nil
}

// HasEntries reports whether the ledger has anything in it yet. It is what locks the
// base currency: an empty ledger can still choose one.
func (s *Store) HasEntries(ctx context.Context) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.HasEntries")
	defer endSpan()

	var exists int

	err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM ledger_entries)`).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("has entries: %w", err)
	}

	return exists == 1, nil
}
