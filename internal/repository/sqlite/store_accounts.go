package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// CountAccounts reports how many accounts exist, archived or not.
func (s *Store) CountAccounts(ctx context.Context) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CountAccounts")
	defer endSpan()

	var n int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count accounts: %w", err)
	}

	return n, nil
}

// CreateAccount inserts one account and returns its id.
func (s *Store) CreateAccount(ctx context.Context, name, kind, currency string) (int64, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateAccount")
	defer endSpan()

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
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.FindAccount")
	defer endSpan()

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

// ListAccounts returns the whole chart of accounts, archived rows included: a
// picker filters them out, a report still needs them.
func (s *Store) ListAccounts(ctx context.Context) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListAccounts")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, kind, parent_id, currency, icon, archived_at, created_at
		FROM accounts ORDER BY kind, name`)
	if err != nil {
		return nil, fmt.Errorf("select accounts: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Account

	for rows.Next() {
		var (
			account     entity.Account
			parentID    sql.NullInt64
			icon        sql.NullString
			archivedRaw sql.NullString
			createdRaw  string
		)

		if scanErr := rows.Scan(&account.ID, &account.Name, &account.Kind, &parentID,
			&account.Currency, &icon, &archivedRaw, &createdRaw); scanErr != nil {
			return nil, fmt.Errorf("scan account: %w", scanErr)
		}

		if parentID.Valid {
			id := parentID.Int64
			account.ParentID = &id
		}

		account.Icon = icon.String

		if archivedRaw.Valid {
			at, parseErr := time.Parse(constant.TimestampLayout, archivedRaw.String)
			if parseErr != nil {
				return nil, fmt.Errorf("archived_at %q: %w", archivedRaw.String, parseErr)
			}

			account.ArchivedAt = &at
		}

		if account.CreatedAt, err = time.Parse(constant.TimestampLayout, createdRaw); err != nil {
			return nil, fmt.Errorf("created_at %q: %w", createdRaw, err)
		}

		out = append(out, account)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}

	return out, nil
}

// BalancesByAccount sums base postings per account. Postings are the only source of
// a balance; there is no cached column to drift.
func (s *Store) BalancesByAccount(ctx context.Context) (map[int64]int64, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.BalancesByAccount")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT p.account_id, SUM(p.base_amount_minor)
		FROM ledger_postings p
		GROUP BY p.account_id`)
	if err != nil {
		return nil, fmt.Errorf("select balances: %w", err)
	}

	defer func() { _ = rows.Close() }()

	balances := map[int64]int64{}

	for rows.Next() {
		var (
			accountID int64
			total     int64
		)

		if err := rows.Scan(&accountID, &total); err != nil {
			return nil, fmt.Errorf("scan balance: %w", err)
		}

		balances[accountID] = total
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate balances: %w", err)
	}

	return balances, nil
}
