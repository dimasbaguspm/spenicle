package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// CountAccounts reports how many accounts exist, archived or not.
func (s *Store) CountAccounts(ctx context.Context) (int, error) {
	var n int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count accounts: %w", err)
	}

	return n, nil
}

// CreateAccount inserts one account and returns its id.
func (s *Store) CreateAccount(ctx context.Context, name, kind, currency string) (int64, error) {
	res, err := s.db.ExecContext(
		ctx,
		`INSERT INTO accounts (name, kind, parent_id, currency, icon, archived_at, created_at)
		 VALUES (?, ?, NULL, ?, NULL, NULL, ?)`,
		name,
		kind,
		currency,
		time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		return 0, fmt.Errorf("create account %q: %w", name, err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("account id: %w", err)
	}

	return id, nil
}

// FindAccount resolves an account by name and kind. Callers use it to make a
// create step idempotent without guessing ids.
func (s *Store) FindAccount(ctx context.Context, name, kind string) (int64, bool, error) {
	var id int64

	err := s.db.QueryRowContext(ctx,
		`SELECT id FROM accounts WHERE name = ? AND kind = ?`, name, kind).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}

	if err != nil {
		return 0, false, fmt.Errorf("find account %q: %w", name, err)
	}

	return id, true, nil
}
