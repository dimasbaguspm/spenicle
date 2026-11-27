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

const accountColumns = `id, ref, name, kind, COALESCE(parent_ref, ''), currency, icon,
	archived_at, created_at`

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
	return s.CreateAccountWithParent(ctx, name, kind, currency, "")
}

func (s *Store) CreateAccountWithParent(
	ctx context.Context,
	name, kind, currency, parentRef string,
) (entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateAccountWithParent")
	defer endSpan()

	createdAt := time.Now().UTC()
	ref := uuid.New()

	var id int64

	var resolved string

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		parent, resolveErr := s.resolveParent(ctx, tx, entity.Account{Kind: kind}, parentRef)
		if resolveErr != nil {
			return resolveErr
		}

		resolved = parent

		res, execErr := tx.ExecContext(
			ctx,
			`INSERT INTO accounts (ref, name, kind, parent_ref, currency, icon, archived_at, created_at)
			 VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
			ref,
			name,
			kind,
			nullString(parent),
			currency,
			createdAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("create account %q: %w", name, uniqueViolation(execErr))
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
			To: entity.AccountChanged{
				Name: name, Kind: kind, Currency: currency, ParentRef: parentRef,
			},
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
		ParentRef: resolved,
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

	var resolved string

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		parentRef, resolveErr := s.resolveParent(ctx, tx, account, account.ParentRef)
		if resolveErr != nil {
			return resolveErr
		}

		resolved = parentRef

		res, execErr := tx.ExecContext(ctx, `
			UPDATE accounts SET name = ?, icon = ?, archived_at = ?, parent_ref = ?
			WHERE ref = ?`,
			account.Name,
			nullString(account.Icon),
			nullTime(account.ArchivedAt),
			nullString(resolved),
			account.Ref,
		)
		if execErr != nil {
			return fmt.Errorf("update account %q: %w", account.Ref, uniqueViolation(execErr))
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
				Name:       account.Name,
				Icon:       account.Icon,
				ParentRef:  account.ParentRef,
				ArchivedAt: auditTime(account.ArchivedAt),
			},
		})
	})
	if err != nil {
		return entity.Account{}, err
	}

	account.ParentRef = resolved

	return account, nil
}

func (s *Store) resolveParent(
	ctx context.Context,
	tx *sql.Tx,
	child entity.Account,
	parentRef string,
) (string, error) {
	if parentRef == "" {
		return "", nil
	}

	chain, err := s.parentChain(ctx, tx, parentRef)
	if err != nil {
		return "", err
	}

	descendants := 0

	if child.Ref != "" {
		height, heightErr := s.subtreeHeight(ctx, tx, child.Ref)
		if heightErr != nil {
			return "", heightErr
		}

		descendants = height
	}

	if err := entity.CheckParent(entity.AccountParent{
		ChildRef:    child.Ref,
		ChildKind:   child.Kind,
		Ancestors:   chain,
		Descendants: descendants,
	}); err != nil {
		return "", err
	}

	return parentRef, nil
}

func (s *Store) parentChain(ctx context.Context, tx *sql.Tx, ref string) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ParentChain")
	defer endSpan()

	rows, err := tx.QueryContext(ctx, `
		WITH RECURSIVE chain(ref, kind, parent_ref, depth) AS (
			SELECT ref, kind, parent_ref, 1 FROM accounts WHERE ref = ?
			UNION ALL
			SELECT a.ref, a.kind, a.parent_ref, chain.depth + 1
			FROM accounts a JOIN chain ON a.ref = chain.parent_ref
		)
		SELECT ref, kind FROM chain ORDER BY depth`, ref)
	if err != nil {
		return nil, fmt.Errorf("select parent chain %q: %w", ref, err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Account

	for rows.Next() {
		var account entity.Account

		if scanErr := rows.Scan(&account.Ref, &account.Kind); scanErr != nil {
			return nil, fmt.Errorf("scan parent chain: %w", scanErr)
		}

		out = append(out, account)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate parent chain: %w", err)
	}

	if len(out) == 0 {
		return nil, fmt.Errorf("%w: account %s", entity.ErrNotFound, ref)
	}

	return out, nil
}

func (s *Store) subtreeHeight(ctx context.Context, tx *sql.Tx, ref string) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SubtreeHeight")
	defer endSpan()

	var height int

	if err := tx.QueryRowContext(ctx, `
		WITH RECURSIVE down(ref, depth) AS (
			SELECT ref, 0 FROM accounts WHERE ref = ?
			UNION ALL
			SELECT a.ref, down.depth + 1 FROM accounts a JOIN down ON a.parent_ref = down.ref
		)
		SELECT COALESCE(MAX(depth), 0) FROM down`, ref).Scan(&height); err != nil {
		return 0, fmt.Errorf("measure subtree %s: %w", ref, err)
	}

	return height, nil
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
	builder.prefix("name", filter.Query)
	builder.parentRef("parent_ref", filter.ParentRef)
	builder.inList("ref", filter.Refs)
	builder.nullFlag("archived_at", filter.Archived)
	builder.after("accounts.kind, accounts.name, accounts.id", "kind, name, id", "accounts", filter.Cursor)
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

func (s *Store) BalancesByAccount(ctx context.Context) (map[string]int64, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.BalancesByAccount")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT p.account_ref, SUM(p.base_amount_minor)
		FROM ledger_postings p
		GROUP BY p.account_ref`)
	if err != nil {
		return nil, fmt.Errorf("select balances: %w", err)
	}

	defer func() { _ = rows.Close() }()

	balances := map[string]int64{}

	for rows.Next() {
		var (
			accountRef string
			total      int64
		)

		if err := rows.Scan(&accountRef, &total); err != nil {
			return nil, fmt.Errorf("scan balance: %w", err)
		}

		balances[accountRef] = total
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate balances: %w", err)
	}

	return balances, nil
}

func scanAccountRow(scanner interface{ Scan(dest ...any) error }) (entity.Account, error) {
	var (
		account     entity.Account
		icon        sql.NullString
		archivedRaw sql.NullString
		createdRaw  string
	)

	if err := scanner.Scan(
		&account.ID,
		&account.Ref,
		&account.Name,
		&account.Kind,
		&account.ParentRef,
		&account.Currency,
		&icon,
		&archivedRaw,
		&createdRaw,
	); err != nil {
		return entity.Account{}, err
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
