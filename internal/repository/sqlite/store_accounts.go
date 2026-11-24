package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
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
	ref := uuid.New()

	var id int64

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(
			ctx,
			`INSERT INTO accounts (ref, name, kind, parent_id, currency, icon, archived_at, created_at)
			 VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?)`,
			ref,
			name,
			kind,
			currency,
			createdAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("create account %q: %w", name, execErr)
		}

		inserted, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("account id: %w", idErr)
		}

		id = inserted

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityAccount,
			ID:     id,
			Ref:    ref,
			Action: constant.AuditActionCreate,
			To:     entity.AccountChanged{Name: name, Kind: kind, Currency: currency},
		})
	})
	if err != nil {
		return entity.Account{}, err
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

func (s *Store) UpdateAccount(ctx context.Context, account entity.Account) (entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateAccount")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			UPDATE accounts SET name = ?, icon = ?, archived_at = ?
			WHERE ref = ?`,
			account.Name,
			nullString(account.Icon),
			nullTime(account.ArchivedAt),
			account.Ref,
		)
		if execErr != nil {
			return fmt.Errorf("update account %q: %w", account.Ref, execErr)
		}

		affected, rowsErr := res.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("account rows: %w", rowsErr)
		}

		if affected == 0 {
			return fmt.Errorf("%w: account %s", entity.ErrNotFound, account.Ref)
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityAccount,
			ID:     account.ID,
			Ref:    account.Ref,
			Action: constant.AuditActionUpdate,
			To: entity.AccountChanged{
				Name: account.Name, Icon: account.Icon, ArchivedAt: auditTime(account.ArchivedAt),
			},
		})
	})
	if err != nil {
		return entity.Account{}, err
	}

	return account, nil
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

func (s *Store) ListAccounts(ctx context.Context, filter entity.AccountFilter) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListAccounts")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("accounts", accountColumns)
	builder.eq("kind", filter.Kind)
	builder.eq("currency", filter.Currency)
	builder.like("name", filter.Query)
	builder.parentRef("parent_id", "accounts", filter.ParentRef)
	builder.inList("ref", filter.Refs)
	builder.nullFlag("archived_at", filter.Archived)
	builder.before("accounts.id", "accounts", filter.Cursor)
	builder.orderBy("kind, name, id")

	query, args := builder.page(limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select accounts: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Account, 0, limit+1)

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
