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
		FROM postings p
		JOIN entries e ON e.ref = p.entry_ref
		JOIN accounts a ON a.ref = p.account_ref
		WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
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

	// The series is a calendar, not a list of the months that happened to move: a month
	// with no postings is a zero, which is what a chart and a running total both need.
	return fillMonths(from, to, out), nil
}

func fillMonths(from, to time.Time, totals []entity.MonthTotal) []entity.MonthTotal {
	byMonth := make(map[string]entity.MonthTotal, len(totals))
	for _, total := range totals {
		byMonth[total.Month] = total
	}

	filled := make([]entity.MonthTotal, 0, len(totals)+1)

	first := time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, from.Location())
	for cursor := first; !cursor.After(to); cursor = cursor.AddDate(0, 1, 0) {
		key := cursor.Format(constant.MonthLayout)

		total, found := byMonth[key]
		if !found {
			total = entity.MonthTotal{Month: key}
		}

		filled = append(filled, total)
	}

	return filled
}

const categoryTotalsQuery = `
	SELECT a.ref, a.name, a.kind, SUM(p.base_amount_minor),
	       MIN(e.occurred_on), MAX(e.occurred_on)
	FROM postings p
	JOIN entries e ON e.ref = p.entry_ref
	JOIN accounts a ON a.ref = p.account_ref
	WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
	  AND e.occurred_on BETWEEN ? AND ?
	  AND a.kind = ?
	GROUP BY a.ref
	HAVING SUM(p.base_amount_minor) <> 0
	ORDER BY SUM(p.base_amount_minor) DESC`

const categoryTotalsByRootQuery = `
	WITH RECURSIVE tree(ref, root_ref) AS (
		SELECT ref, ref FROM accounts WHERE parent_ref IS NULL
		UNION ALL
		SELECT a.ref, tree.root_ref FROM accounts a JOIN tree ON a.parent_ref = tree.ref
	)
	SELECT root.ref, root.name, root.kind, SUM(p.base_amount_minor),
	       MIN(e.occurred_on), MAX(e.occurred_on)
	FROM postings p
	JOIN entries e ON e.ref = p.entry_ref
	JOIN tree ON tree.ref = p.account_ref
	JOIN accounts root ON root.ref = tree.root_ref
	WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
	  AND e.occurred_on BETWEEN ? AND ?
	  AND root.kind = ?
	GROUP BY root.ref
	HAVING SUM(p.base_amount_minor) <> 0
	ORDER BY SUM(p.base_amount_minor) DESC`

const categoryTotalsByMonthQuery = `
	SELECT a.ref, a.name, substr(e.occurred_on, 1, 7), SUM(p.base_amount_minor)
	FROM postings p
	JOIN entries e ON e.ref = p.entry_ref
	JOIN accounts a ON a.ref = p.account_ref
	WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
	  AND e.occurred_on BETWEEN ? AND ?
	  AND a.kind = ?
	GROUP BY a.ref, substr(e.occurred_on, 1, 7)
	HAVING SUM(p.base_amount_minor) <> 0
	ORDER BY a.name, substr(e.occurred_on, 1, 7)`

func (s *Store) CategoryTotals(
	ctx context.Context,
	from, to time.Time,
	kind string,
) ([]entity.CategoryTotal, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CategoryTotals")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, categoryTotalsQuery,
		from.Format(constant.DateLayout), to.Format(constant.DateLayout), kind)
	if err != nil {
		return nil, fmt.Errorf("select category totals: %w", err)
	}

	defer func() { _ = rows.Close() }()

	return scanCategoryTotals(rows)
}

func (s *Store) CategoryTotalsByRoot(
	ctx context.Context,
	from, to time.Time,
	kind string,
) ([]entity.CategoryTotal, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CategoryTotalsByRoot")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, categoryTotalsByRootQuery,
		from.Format(constant.DateLayout), to.Format(constant.DateLayout), kind)
	if err != nil {
		return nil, fmt.Errorf("select category roll-up: %w", err)
	}

	defer func() { _ = rows.Close() }()

	return scanCategoryTotals(rows)
}

func (s *Store) CategoryTotalsByMonth(
	ctx context.Context,
	from, to time.Time,
	kind string,
) ([]entity.CategoryMonthlyTotal, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CategoryTotalsByMonth")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, categoryTotalsByMonthQuery,
		from.Format(constant.DateLayout), to.Format(constant.DateLayout), kind)
	if err != nil {
		return nil, fmt.Errorf("select category months: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.CategoryMonthlyTotal

	for rows.Next() {
		var (
			ref   string
			name  string
			total entity.CategoryMonthTotal
		)

		if scanErr := rows.Scan(&ref, &name, &total.Month, &total.AmountMinor); scanErr != nil {
			return nil, fmt.Errorf("scan category month: %w", scanErr)
		}

		if len(out) == 0 || out[len(out)-1].AccountRef != ref {
			out = append(out, entity.CategoryMonthlyTotal{AccountRef: ref, AccountName: name})
		}

		out[len(out)-1].Months = append(out[len(out)-1].Months, total)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate category months: %w", err)
	}

	return out, nil
}

func scanCategoryTotals(rows *sql.Rows) ([]entity.CategoryTotal, error) {
	var out []entity.CategoryTotal

	for rows.Next() {
		var total entity.CategoryTotal

		if err := rows.Scan(&total.AccountRef, &total.AccountName, &total.Kind,
			&total.AmountMinor, &total.FirstOccurredOn, &total.LastOccurredOn); err != nil {
			return nil, fmt.Errorf("scan category total: %w", err)
		}

		out = append(out, total)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate category totals: %w", err)
	}

	return out, nil
}

func (s *Store) CaptureCount(
	ctx context.Context,
	from, to time.Time,
	status string,
) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureCount")
	defer endSpan()

	var count int

	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM captures
		WHERE status = ? AND received_at >= ? AND received_at < ?`,
		status,
		from.Format(constant.TimestampLayout),
		to.AddDate(0, 0, 1).Format(constant.TimestampLayout),
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("count captures %q: %w", status, err)
	}

	return count, nil
}

const payeeTotalsQuery = `
	SELECT COALESCE(e.payee_ref, ''), COALESCE(py.name, ''), SUM(p.base_amount_minor)
	FROM postings p
	JOIN entries e ON e.ref = p.entry_ref
	JOIN accounts a ON a.ref = p.account_ref
	LEFT JOIN payees py ON py.ref = e.payee_ref
	WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
	  AND e.occurred_on BETWEEN ? AND ?
	  AND a.kind = ?
	GROUP BY e.payee_ref
	HAVING SUM(p.base_amount_minor) <> 0
	ORDER BY SUM(p.base_amount_minor) DESC`

func (s *Store) PayeeTotals(
	ctx context.Context,
	from, to time.Time,
	kind string,
) ([]entity.PayeeTotal, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.PayeeTotals")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, payeeTotalsQuery,
		from.Format(constant.DateLayout), to.Format(constant.DateLayout), kind)
	if err != nil {
		return nil, fmt.Errorf("select payee totals: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.PayeeTotal

	for rows.Next() {
		var total entity.PayeeTotal

		if err := rows.Scan(&total.PayeeRef, &total.PayeeName, &total.AmountMinor); err != nil {
			return nil, fmt.Errorf("scan payee total: %w", err)
		}

		out = append(out, total)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate payee totals: %w", err)
	}

	return out, nil
}

// The money side of the ledger: an expense or income account says what the money was for,
// not where it sat, so those two kinds are left out of the flow on purpose.
const accountFlowsQuery = `
	SELECT a.ref, a.name, a.kind,
	       SUM(CASE WHEN p.base_amount_minor > 0 THEN p.base_amount_minor ELSE 0 END),
	       SUM(CASE WHEN p.base_amount_minor < 0 THEN -p.base_amount_minor ELSE 0 END),
	       SUM(p.base_amount_minor)
	FROM postings p
	JOIN entries e ON e.ref = p.entry_ref
	JOIN accounts a ON a.ref = p.account_ref
	WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
	  AND e.occurred_on BETWEEN ? AND ?
	  AND a.kind IN ('asset', 'liability')
	GROUP BY a.ref
	ORDER BY SUM(p.base_amount_minor) DESC`

func (s *Store) AccountFlows(
	ctx context.Context,
	from, to time.Time,
) ([]entity.AccountFlow, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AccountFlows")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, accountFlowsQuery,
		from.Format(constant.DateLayout), to.Format(constant.DateLayout))
	if err != nil {
		return nil, fmt.Errorf("select account flows: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.AccountFlow

	for rows.Next() {
		var flow entity.AccountFlow

		if err := rows.Scan(&flow.AccountRef, &flow.AccountName, &flow.Kind,
			&flow.InflowMinor, &flow.OutflowMinor, &flow.NetMinor); err != nil {
			return nil, fmt.Errorf("scan account flow: %w", err)
		}

		out = append(out, flow)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate account flows: %w", err)
	}

	return out, nil
}

func (s *Store) LedgerStats(
	ctx context.Context,
	from, to time.Time,
) (entity.LedgerStats, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.LedgerStats")
	defer endSpan()

	start, end := from.Format(constant.DateLayout), to.Format(constant.DateLayout)

	var stats entity.LedgerStats

	if err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM entries e
		WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
		  AND e.occurred_on BETWEEN ? AND ?`, start, end).Scan(&stats.Entries); err != nil {
		return entity.LedgerStats{}, fmt.Errorf("count entries: %w", err)
	}

	err := s.db.QueryRowContext(ctx, `
		SELECT e.occurred_on, SUM(p.base_amount_minor)
		FROM postings p
		JOIN entries e ON e.ref = p.entry_ref
		JOIN accounts a ON a.ref = p.account_ref
		WHERE e.reversed_at IS NULL AND e.reversal_of_ref IS NULL
		  AND e.occurred_on BETWEEN ? AND ?
		  AND a.kind = 'expense'
		GROUP BY e.occurred_on
		ORDER BY SUM(p.base_amount_minor) DESC
		LIMIT 1`, start, end).Scan(&stats.BusiestOn, &stats.BusiestSpend)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return entity.LedgerStats{}, fmt.Errorf("select busiest day: %w", err)
	}

	return stats, nil
}
