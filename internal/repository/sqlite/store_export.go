package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) AllAccounts(ctx context.Context) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllAccounts")
	defer endSpan()

	return scanAll(ctx, s.db, "select all accounts",
		`SELECT `+accountColumns+` FROM accounts ORDER BY id`, scanAccountRow)
}

func (s *Store) AllPayees(ctx context.Context) ([]entity.Payee, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllPayees")
	defer endSpan()

	return scanAll(ctx, s.db, "select all payees",
		`SELECT `+payeeColumns+` `+payeeFrom+` ORDER BY p.id`, scanPayeeRow)
}

func (s *Store) AllCaptures(ctx context.Context) ([]entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllCaptures")
	defer endSpan()

	return scanAll(ctx, s.db, "select all captures",
		`SELECT `+captureColumns+` FROM captures `+captureJoin+` ORDER BY captures.id`, scanCaptureRow)
}

func (s *Store) AllRecurring(ctx context.Context) ([]entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllRecurring")
	defer endSpan()

	return scanAll(ctx, s.db, "select all recurring rules",
		`SELECT `+recurringColumns+` `+recurringFrom+` ORDER BY r.id`, scanRecurringRow)
}

func scanAll[T any](
	ctx context.Context,
	db *sql.DB,
	label, query string,
	scan func(scanner interface{ Scan(dest ...any) error }) (T, error),
) ([]T, error) {
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", label, err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]T, 0)

	for rows.Next() {
		row, scanErr := scan(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("%s: %w", label, scanErr)
		}

		out = append(out, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: %w", label, err)
	}

	return out, nil
}

func (s *Store) AllCategorizationRules(ctx context.Context) ([]entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllCategorizationRules")
	defer endSpan()

	return scanAll(ctx, s.db, "select all categorization rules",
		`SELECT `+ruleColumns+` `+ruleFrom+` ORDER BY r.id`, scanRuleRow)
}
