package sqlite

import (
	"context"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) AllAccounts(ctx context.Context) ([]entity.Account, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllAccounts")
	defer endSpan()

	return scanRows(ctx, s.db, "all accounts",
		`SELECT `+accountColumns+` FROM accounts ORDER BY id`, nil, scanAccountRow)
}

func (s *Store) AllPayees(ctx context.Context) ([]entity.Payee, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllPayees")
	defer endSpan()

	return scanRows(ctx, s.db, "all payees",
		`SELECT `+payeeColumns+` `+payeeFrom+` ORDER BY p.id`, nil, scanPayeeRow)
}

func (s *Store) AllCaptures(ctx context.Context) ([]entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllCaptures")
	defer endSpan()

	return scanRows(ctx, s.db, "all captures",
		`SELECT `+captureColumns+` FROM captures `+captureJoin+` ORDER BY captures.id`, nil, scanCaptureRow)
}

func (s *Store) AllRecurring(ctx context.Context) ([]entity.Recurring, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllRecurring")
	defer endSpan()

	return scanRows(ctx, s.db, "all recurring rules",
		`SELECT `+recurringColumns+` `+recurringFrom+` ORDER BY r.id`, nil, scanRecurringRow)
}

func (s *Store) AllCategorizationRules(ctx context.Context) ([]entity.CategorizationRule, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AllCategorizationRules")
	defer endSpan()

	return scanRows(ctx, s.db, "all categorization rules",
		`SELECT `+ruleColumns+` `+ruleFrom+` ORDER BY r.id`, nil, scanRuleRow)
}
