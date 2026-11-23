package sqlite

import (
	"context"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) MonthlyTotals(
	ctx context.Context,
	from, to time.Time,
) ([]entity.MonthTotal, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.MonthlyTotals")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT substr(e.occurred_on, 1, 7) AS month,
		       SUM(CASE WHEN a.kind = 'expense' THEN p.base_amount_minor ELSE 0 END),
		       SUM(CASE WHEN a.kind = 'income' THEN -p.base_amount_minor ELSE 0 END)
		FROM ledger_postings p
		JOIN ledger_entries e ON e.id = p.entry_id
		JOIN accounts a ON a.id = p.account_id
		WHERE e.voided_at IS NULL AND e.reverses_entry_id IS NULL
		  AND e.occurred_on BETWEEN ? AND ?
		GROUP BY month
		ORDER BY month`, from.Format(constant.DateLayout), to.Format(constant.DateLayout))
	if err != nil {
		return nil, fmt.Errorf("select monthly totals: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.MonthTotal

	for rows.Next() {
		var total entity.MonthTotal

		if err := rows.Scan(&total.Month, &total.SpendMinor, &total.IncomeMinor); err != nil {
			return nil, fmt.Errorf("scan monthly total: %w", err)
		}

		total.NetMinor = total.Net()

		out = append(out, total)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate monthly totals: %w", err)
	}

	return out, nil
}
