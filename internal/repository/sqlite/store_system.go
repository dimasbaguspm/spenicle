package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

func (s *Store) SchemaVersion(ctx context.Context) (int, error) {
	var v sql.NullInt64

	err := s.db.QueryRowContext(ctx, `SELECT MAX(version) FROM schema_migrations`).Scan(&v)
	if err != nil {
		return 0, fmt.Errorf("schema version: %w", err)
	}

	return int(v.Int64), nil
}

// Ping proves the file is writable, not merely readable.
func (s *Store) Ping(ctx context.Context) error {
	var one int
	if err := s.db.QueryRowContext(ctx, `SELECT 1`).Scan(&one); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	return nil
}

// Setting reads one configuration row.
func (s *Store) Setting(ctx context.Context, key string) (string, bool, error) {
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
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO settings (k, v) VALUES (?, ?)
		ON CONFLICT (k) DO UPDATE SET v = excluded.v`, key, value)
	if err != nil {
		return fmt.Errorf("set setting %q: %w", key, err)
	}

	return nil
}

// BaseCurrencyCode returns the locked reporting currency.
func (s *Store) BaseCurrencyCode(ctx context.Context) (string, error) {
	v, ok, err := s.Setting(ctx, constant.SettingBaseCurrency)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("base_currency is not configured")
	}

	return v, nil
}
