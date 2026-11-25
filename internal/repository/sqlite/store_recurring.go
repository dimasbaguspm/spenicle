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

const recurringColumns = `r.id, r.ref, p.ref, a.ref, COALESCE(c.ref, ''), r.amount_minor,
	r.currency, r.cadence, r.interval_n, COALESCE(r.day_of_month, 0), r.business_day_shift,
	r.next_due_on, r.ends_on, r.origin, r.state, r.last_posted_on, r.created_at`

const recurringJoins = `JOIN payees p ON p.id = r.payee_id
	JOIN accounts a ON a.id = r.account_id
	LEFT JOIN accounts c ON c.id = r.category_id`

const recurringFrom = `FROM recurring_rules r ` + recurringJoins

func (s *Store) CreateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateRecurring")
	defer endSpan()

	payee, found, err := s.PayeeByRef(ctx, rule.PayeeRef)
	if err != nil {
		return entity.Recurring{}, err
	}

	if !found {
		return entity.Recurring{}, fmt.Errorf("%w: payee %s", entity.ErrNotFound, rule.PayeeRef)
	}

	accountID, err := s.accountID(ctx, rule.AccountRef)
	if err != nil {
		return entity.Recurring{}, err
	}

	categoryID, err := s.accountID(ctx, rule.CategoryRef)
	if err != nil {
		return entity.Recurring{}, err
	}

	rule.Ref = uuid.New()
	rule.Origin = constant.RecurringOriginUser
	rule.CreatedAt = time.Now().UTC()

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO recurring_rules
				(ref, payee_id, account_id, category_id, amount_minor, currency, cadence,
				 interval_n, day_of_month, business_day_shift, next_due_on, ends_on,
				 origin, state, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			rule.Ref,
			payee.ID,
			accountID.Int64,
			categoryID,
			rule.AmountMinor,
			rule.Currency,
			rule.Cadence,
			rule.IntervalN,
			nullInt(dayOfMonth(rule.DayOfMonth)),
			rule.BusinessDayShift,
			rule.NextDueOn.Format(constant.DateLayout),
			nullDay(rule.EndsOn),
			rule.Origin,
			rule.State,
			rule.CreatedAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("create recurring rule: %w", execErr)
		}

		inserted, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("recurring id: %w", idErr)
		}

		rule.ID = inserted

		return appendRecurringCreated(ctx, tx, rule)
	})
	if err != nil {
		return entity.Recurring{}, err
	}

	return rule, nil
}

func (s *Store) RecurringByRef(ctx context.Context, ref string) (entity.Recurring, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RecurringByRef")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+recurringColumns+` `+recurringFrom+` WHERE r.ref = ?`, ref)

	rule, err := scanRecurringRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Recurring{}, false, nil
	}

	if err != nil {
		return entity.Recurring{}, false, fmt.Errorf("recurring %q: %w", ref, err)
	}

	return rule, true, nil
}

func (s *Store) DueRecurring(
	ctx context.Context,
	asOf time.Time,
	limit int,
) ([]entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.DueRecurring")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `SELECT `+recurringColumns+` `+recurringFrom+
		` WHERE r.state = ? AND r.next_due_on <= ? AND (r.ends_on IS NULL OR r.ends_on >= ?)
		ORDER BY r.next_due_on, r.id LIMIT ?`,
		constant.RecurringStateActive,
		asOf.Format(constant.DateLayout),
		asOf.Format(constant.DateLayout),
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("select due recurring rules: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Recurring, 0, limit)

	for rows.Next() {
		rule, scanErr := scanRecurringRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, rule)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate due recurring rules: %w", err)
	}

	return out, nil
}

func (s *Store) ListRecurring(
	ctx context.Context,
	filter entity.RecurringFilter,
) ([]entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListRecurring")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("recurring_rules r", recurringColumns)
	builder.join(recurringJoins)
	builder.eq("r.state", filter.State)
	builder.eq("r.cadence", filter.Cadence)
	builder.like("p.name", filter.Query)
	builder.inList("r.ref", filter.Refs)
	builder.after("r.next_due_on, r.id", "next_due_on, id", "recurring_rules", filter.Cursor)
	builder.orderBy("r.next_due_on, r.id")

	query, args := builder.page(limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select recurring rules: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Recurring, 0, limit+1)

	for rows.Next() {
		rule, scanErr := scanRecurringRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, rule)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recurring rules: %w", err)
	}

	return out, nil
}

func (s *Store) UpdateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateRecurring")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, execErr := tx.ExecContext(ctx, `
			UPDATE recurring_rules SET amount_minor = ?, cadence = ?, interval_n = ?,
				day_of_month = ?, business_day_shift = ?, next_due_on = ?, ends_on = ?,
				state = ?
			WHERE ref = ?`,
			rule.AmountMinor,
			rule.Cadence,
			rule.IntervalN,
			nullInt(dayOfMonth(rule.DayOfMonth)),
			rule.BusinessDayShift,
			rule.NextDueOn.Format(constant.DateLayout),
			nullDay(rule.EndsOn),
			rule.State,
			rule.Ref,
		); execErr != nil {
			return fmt.Errorf("update recurring %q: %w", rule.Ref, execErr)
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityRecurring,
			ID:     rule.ID,
			Ref:    rule.Ref,
			Action: constant.AuditActionUpdate,
			To: entity.RecurringChanged{
				Cadence:   rule.Cadence,
				Amount:    rule.AmountMinor,
				Currency:  rule.Currency,
				State:     rule.State,
				NextDueOn: rule.NextDueOn.Format(constant.DateLayout),
			},
		})
	})
	if err != nil {
		return entity.Recurring{}, err
	}

	return rule, nil
}

func (s *Store) AdvanceRecurring(
	ctx context.Context,
	ref string,
	from, to, postedAt time.Time,
) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AdvanceRecurring")
	defer endSpan()

	var advanced bool

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			UPDATE recurring_rules SET next_due_on = ?, last_posted_on = ?
			WHERE ref = ? AND next_due_on = ?`,
			to.Format(constant.DateLayout),
			postedAt.Format(constant.DateLayout),
			ref,
			from.Format(constant.DateLayout),
		)
		if execErr != nil {
			return fmt.Errorf("advance recurring %q: %w", ref, execErr)
		}

		affected, rowsErr := res.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("recurring rows: %w", rowsErr)
		}

		advanced = affected == 1

		if !advanced {
			return nil
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityRecurring,
			Ref:    ref,
			Action: constant.AuditActionAdvance,
			From:   entity.RecurringChanged{NextDueOn: from.Format(constant.DateLayout)},
			To:     entity.RecurringChanged{NextDueOn: to.Format(constant.DateLayout)},
		})
	})
	if err != nil {
		return false, err
	}

	return advanced, nil
}

func dayOfMonth(day int) *int64 {
	if day == 0 {
		return nil
	}

	value := int64(day)

	return &value
}

func scanRecurringRow(scanner interface{ Scan(dest ...any) error }) (entity.Recurring, error) {
	var (
		rule       entity.Recurring
		nextRaw    string
		endsRaw    sql.NullString
		postedRaw  sql.NullString
		createdRaw string
	)

	if err := scanner.Scan(&rule.ID, &rule.Ref, &rule.PayeeRef, &rule.AccountRef,
		&rule.CategoryRef, &rule.AmountMinor, &rule.Currency, &rule.Cadence, &rule.IntervalN,
		&rule.DayOfMonth, &rule.BusinessDayShift, &nextRaw, &endsRaw, &rule.Origin,
		&rule.State, &postedRaw, &createdRaw); err != nil {
		return entity.Recurring{}, err
	}

	var err error

	if rule.NextDueOn, err = time.Parse(constant.DateLayout, nextRaw); err != nil {
		return entity.Recurring{}, fmt.Errorf("next_due_on %q: %w", nextRaw, err)
	}

	if rule.EndsOn, err = parseDay(endsRaw); err != nil {
		return entity.Recurring{}, err
	}

	if rule.LastPostedOn, err = parseDay(postedRaw); err != nil {
		return entity.Recurring{}, err
	}

	if rule.CreatedAt, err = time.Parse(constant.TimestampLayout, createdRaw); err != nil {
		return entity.Recurring{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	return rule, nil
}

func parseDay(raw sql.NullString) (*time.Time, error) {
	if !raw.Valid || raw.String == "" {
		return nil, nil //nolint:nilnil // no date is not an error
	}

	parsed, err := time.Parse(constant.DateLayout, raw.String)
	if err != nil {
		return nil, fmt.Errorf("date %q: %w", raw.String, err)
	}

	return &parsed, nil
}
