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

const accountColumns = `id, ref, name, kind, parent_id, currency, icon, archived_at, created_at`

func (s *Store) CountAccounts(ctx context.Context) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CountAccounts")
	defer endSpan()

	var n int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count accounts: %w", err)
	}

	return n, nil
}

func (s *Store) CreateAccount(ctx context.Context, name, kind, currency string) (entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateAccount")
	defer endSpan()

	createdAt := time.Now().UTC()
	ref := entity.NewRef()

	res, err := s.db.ExecContext(
		ctx,
		`INSERT INTO accounts (ref, name, kind, parent_id, currency, icon, archived_at, created_at)
		 VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?)`,
		ref,
		name,
		kind,
		currency,
		createdAt.Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.Account{}, fmt.Errorf("create account %q: %w", name, err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.Account{}, fmt.Errorf("account id: %w", err)
	}

	return entity.Account{
		ID:        id,
		Ref:       ref,
		Name:      name,
		Kind:      kind,
		Currency:  currency,
		CreatedAt: createdAt,
	}, nil
}

func (s *Store) FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.FindAccount")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+accountColumns+` FROM accounts WHERE name = ? AND kind = ?`, name, kind)

	account, err := scanAccountRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Account{}, false, nil
	}

	if err != nil {
		return entity.Account{}, false, fmt.Errorf("find account %q: %w", name, err)
	}

	return account, true, nil
}

func (s *Store) AccountByRef(
	ctx context.Context,
	ref string,
) (entity.Account, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AccountByRef")
	defer endSpan()

	row := s.db.QueryRowContext(ctx, `SELECT `+accountColumns+` FROM accounts WHERE ref = ?`, ref)

	account, err := scanAccountRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Account{}, false, nil
	}

	if err != nil {
		return entity.Account{}, false, fmt.Errorf("account %q: %w", ref, err)
	}

	return account, true, nil
}

func (s *Store) ListAccounts(ctx context.Context) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListAccounts")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT `+accountColumns+`
		FROM accounts ORDER BY kind, name`)
	if err != nil {
		return nil, fmt.Errorf("select accounts: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Account

	for rows.Next() {
		account, scanErr := scanAccountRow(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan account: %w", scanErr)
		}

		out = append(out, account)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}

	return out, nil
}

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

func scanAccountRow(scanner interface{ Scan(dest ...any) error }) (entity.Account, error) {
	var (
		account     entity.Account
		parentID    sql.NullInt64
		icon        sql.NullString
		archivedRaw sql.NullString
		createdRaw  string
	)

	if err := scanner.Scan(
		&account.ID,
		&account.Ref,
		&account.Name,
		&account.Kind,
		&parentID,
		&account.Currency,
		&icon,
		&archivedRaw,
		&createdRaw,
	); err != nil {
		return entity.Account{}, err
	}

	if parentID.Valid {
		id := parentID.Int64
		account.ParentID = &id
	}

	account.Icon = icon.String

	if archivedRaw.Valid {
		at, err := time.Parse(constant.TimestampLayout, archivedRaw.String)
		if err != nil {
			return entity.Account{}, fmt.Errorf("archived_at %q: %w", archivedRaw.String, err)
		}

		account.ArchivedAt = &at
	}

	createdAt, err := time.Parse(constant.TimestampLayout, createdRaw)
	if err != nil {
		return entity.Account{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	account.CreatedAt = createdAt

	return account, nil
}
