package repositories

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
)

type SummaryRepository struct {
	db DBQuerier
}

func NewSummaryRepository(db DBQuerier) SummaryRepository {
	return SummaryRepository{db}
}

func (sr SummaryRepository) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionSearchModel) (models.SummaryTransactionListModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var groupingFunc string
	switch p.Frequency {
	case "daily":
		groupingFunc = "TO_CHAR(date, 'YYYY-MM-DD')"
	case "weekly":
		groupingFunc = "TO_CHAR(date, 'IYYY-\"W\"IW')"
	case "yearly":
		groupingFunc = "TO_CHAR(date, 'YYYY')"
	default:
		groupingFunc = "TO_CHAR(date, 'YYYY-MM')"
	}

	sql := `
		WITH period_range AS (
			SELECT
				date,
				` + groupingFunc + ` as period
			FROM generate_series($1::timestamptz, $2::timestamptz, INTERVAL '1 day') as date
		),
		all_periods AS (
			SELECT DISTINCT period 
			FROM period_range
			WHERE date > DATE_TRUNC('month', $1::timestamptz)
			ORDER BY period DESC
		),
		transactions_summary AS (
			SELECT
				` + groupingFunc + ` as period,
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE type = 'income') as income_count,
				COUNT(*) FILTER (WHERE type = 'expense') as expense_count,
				COUNT(*) FILTER (WHERE type = 'transfer') as transfer_count,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as income_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'transfer'), 0) as transfer_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as net
			FROM transactions
			WHERE deleted_at IS NULL AND date >= $1::timestamptz AND date <= $2::timestamptz
			GROUP BY period
		)
		SELECT
			ap.period,
			COALESCE(ts.total_count, 0) as total_count,
			COALESCE(ts.income_count, 0) as income_count,
			COALESCE(ts.expense_count, 0) as expense_count,
			COALESCE(ts.transfer_count, 0) as transfer_count,
			COALESCE(ts.income_amount, 0) as income_amount,
			COALESCE(ts.expense_amount, 0) as expense_amount,
			COALESCE(ts.transfer_amount, 0) as transfer_amount,
			COALESCE(ts.net, 0) as net
		FROM all_periods ap
		LEFT JOIN transactions_summary ts ON ap.period = ts.period
		ORDER BY ap.period DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.SummaryTransactionListModel{}, huma.Error500InternalServerError("query transaction summary: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var items []models.SummaryTransactionModel
	for rows.Next() {
		var item models.SummaryTransactionModel
		if err := rows.Scan(
			&item.Period,
			&item.TotalCount,
			&item.IncomeCount,
			&item.ExpenseCount,
			&item.TransferCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.TransferAmount,
			&item.Net,
		); err != nil {
			return models.SummaryTransactionListModel{}, huma.Error500InternalServerError("scan transaction summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryTransactionModel{}
	}

	return models.SummaryTransactionListModel{
		Frequency: p.Frequency,
		Data:      items,
	}, nil
}

func (sr SummaryRepository) GetAccountSummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryAccountListModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH accounts_cte AS (
			SELECT id, name, type
			FROM accounts
			WHERE deleted_at IS NULL
		),
		txs AS (
			SELECT account_id, type, amount
			FROM transactions
			WHERE deleted_at IS NULL
				AND type != 'transfer'
				AND ($1::timestamptz IS NULL OR date >= $1::timestamptz)
				AND ($2::timestamptz IS NULL OR date <= $2::timestamptz)
		),
		summary AS (
			SELECT
				a.id as account_id,
				a.name as account_name,
				a.type as account_type,
				COUNT(t.account_id) as total_count,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net
			FROM accounts_cte a
			LEFT JOIN txs t ON t.account_id = a.id
			GROUP BY a.id, a.name, a.type
		)
		SELECT
			account_id,
			account_name,
			account_type,
			total_count,
			income_amount,
			expense_amount,
			net
		FROM summary
		ORDER BY total_count DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.SummaryAccountListModel{}, huma.Error500InternalServerError("query account summary: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "accounts", time.Since(queryStart).Seconds())

	var items []models.SummaryAccountModel
	for rows.Next() {
		var item models.SummaryAccountModel
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Type,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return models.SummaryAccountListModel{}, huma.Error500InternalServerError("scan account summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryAccountModel{}
	}

	return models.SummaryAccountListModel{
		Data: items,
	}, nil
}

func (sr SummaryRepository) GetCategorySummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryCategoryListModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH categories_cte AS (
			SELECT id, name, type
			FROM categories
			WHERE deleted_at IS NULL
		),
		txs AS (
			SELECT category_id, type, amount
			FROM transactions
			WHERE deleted_at IS NULL
				AND type != 'transfer'
				AND ($1::timestamptz IS NULL OR date >= $1::timestamptz)
				AND ($2::timestamptz IS NULL OR date <= $2::timestamptz)
		),
		summary AS (
			SELECT
				c.id as category_id,
				c.name as category_name,
				c.type as category_type,
				COUNT(t.category_id) as total_count,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net
			FROM categories_cte c
			LEFT JOIN txs t ON t.category_id = c.id
			GROUP BY c.id, c.name, c.type
		)
		SELECT
			category_id,
			category_name,
			category_type,
			total_count,
			income_amount,
			expense_amount,
			net
		FROM summary
		ORDER BY total_count DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.SummaryCategoryListModel{}, huma.Error500InternalServerError("query category summary: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "categories", time.Since(queryStart).Seconds())

	var items []models.SummaryCategoryModel
	for rows.Next() {
		var item models.SummaryCategoryModel
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Type,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return models.SummaryCategoryListModel{}, huma.Error500InternalServerError("scan category summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryCategoryModel{}
	}

	return models.SummaryCategoryListModel{
		Data: items,
	}, nil
}
