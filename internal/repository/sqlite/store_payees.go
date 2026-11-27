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

const payeeColumns = `p.id, p.ref, p.name,
	COALESCE(p.default_account_ref, ''), COALESCE(p.default_category_ref, ''),
	p.archived_at, p.created_at`

const payeeFrom = `FROM payees p`

func (s *Store) CreatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreatePayee")
	defer endSpan()

	if err := requireAccounts(ctx, s.db, payee.DefaultAccountRef, payee.DefaultCategoryRef); err != nil {
		return entity.Payee{}, err
	}

	payee.Ref = uuid.New()
	payee.CreatedAt = time.Now().UTC()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO payees
				(ref, name, default_account_ref, default_category_ref, archived_at, created_at)
			VALUES (?, ?, ?, ?, NULL, ?)`,
			payee.Ref,
			payee.Name,
			nullString(payee.DefaultAccountRef),
			nullString(payee.DefaultCategoryRef),
			payee.CreatedAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("create payee %q: %w", payee.Name, uniqueViolation(execErr))
		}

		inserted, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("payee id: %w", idErr)
		}

		payee.ID = inserted

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityPayee,
			ID:     payee.ID,
			Ref:    payee.Ref,
			Action: constant.AuditActionCreate,
			To:     entity.PayeeChanged{Name: payee.Name},
		})
	})
	if err != nil {
		return entity.Payee{}, err
	}

	return payee, nil
}

func (s *Store) PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.PayeeByRef")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+payeeColumns+` `+payeeFrom+` WHERE p.ref = ?`, ref)

	payee, err := scanPayeeRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Payee{}, false, nil
	}

	if err != nil {
		return entity.Payee{}, false, fmt.Errorf("payee %q: %w", ref, err)
	}

	return payee, true, nil
}

func (s *Store) ListPayees(ctx context.Context, filter entity.PayeeFilter) ([]entity.Payee, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListPayees")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("payees p", payeeColumns)
	builder.prefix("p.name", filter.Query)
	builder.inList("p.ref", filter.Refs)
	builder.nullFlag("p.archived_at", filter.Archived)
	builder.after("p.name, p.id", "name, id", "payees", filter.Cursor)
	builder.orderBy("p.name, p.id")

	query, args := builder.page(limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select payees: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Payee, 0, limit+1)

	for rows.Next() {
		payee, scanErr := scanPayeeRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, payee)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate payees: %w", err)
	}

	return out, nil
}

func (s *Store) UpdatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdatePayee")
	defer endSpan()

	if err := requireAccounts(ctx, s.db, payee.DefaultAccountRef, payee.DefaultCategoryRef); err != nil {
		return entity.Payee{}, err
	}

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, execErr := tx.ExecContext(ctx, `
			UPDATE payees SET name = ?, default_account_ref = ?, default_category_ref = ?,
				archived_at = ?
			WHERE ref = ?`,
			payee.Name,
			nullString(payee.DefaultAccountRef),
			nullString(payee.DefaultCategoryRef),
			nullTime(payee.ArchivedAt),
			payee.Ref,
		); execErr != nil {
			return fmt.Errorf("update payee %q: %w", payee.Ref, uniqueViolation(execErr))
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityPayee,
			ID:     payee.ID,
			Ref:    payee.Ref,
			Action: constant.AuditActionUpdate,
			To:     entity.PayeeChanged{Name: payee.Name, ArchivedAt: auditTime(payee.ArchivedAt)},
		})
	})
	if err != nil {
		return entity.Payee{}, err
	}

	return payee, nil
}

func scanPayeeRow(scanner interface{ Scan(dest ...any) error }) (entity.Payee, error) {
	var (
		payee      entity.Payee
		archivedAt sql.NullString
		createdRaw string
	)

	if err := scanner.Scan(&payee.ID, &payee.Ref, &payee.Name,
		&payee.DefaultAccountRef, &payee.DefaultCategoryRef, &archivedAt, &createdRaw); err != nil {
		return entity.Payee{}, err
	}

	if archivedAt.Valid {
		at, err := time.Parse(constant.TimestampLayout, archivedAt.String)
		if err != nil {
			return entity.Payee{}, fmt.Errorf("archived_at %q: %w", archivedAt.String, err)
		}

		payee.ArchivedAt = &at
	}

	createdAt, err := time.Parse(constant.TimestampLayout, createdRaw)
	if err != nil {
		return entity.Payee{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	payee.CreatedAt = createdAt

	return payee, nil
}
