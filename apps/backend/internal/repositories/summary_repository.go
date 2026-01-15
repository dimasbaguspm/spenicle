package repositories

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SummaryRepository struct {
	pgx *pgxpool.Pool
}

func NewSummaryRepository(pgx *pgxpool.Pool) SummaryRepository {
	return SummaryRepository{pgx}
}

func (sr SummaryRepository) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionSearchModel) (models.SummaryTransactionListModel, error) {
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
			FROM generate_series($1::date, $2::date, INTERVAL '1 day') as date
		),
		all_periods AS (
			SELECT DISTINCT period 
			FROM period_range
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
			WHERE deleted_at IS NULL AND date >= $1 AND date <= $2
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

	rows, err := sr.pgx.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		return models.SummaryTransactionListModel{}, huma.Error422UnprocessableEntity("query transaction summary: %w", err)
	}
	defer rows.Close()

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
			return models.SummaryTransactionListModel{}, huma.Error422UnprocessableEntity("scan transaction summary: %w", err)
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
	sql := `
		WITH filtered AS (
			SELECT 
				a.id,
				a.name,
				a.type,
				t.amount
			FROM transactions t
			JOIN accounts a ON t.account_id = a.id
			WHERE t.deleted_at IS NULL 
				AND a.deleted_at IS NULL
				AND ($1::timestamp IS NULL OR t.date >= $1)
				AND ($2::timestamp IS NULL OR t.date <= $2)
		),
		summary AS (
			SELECT 
				id as account_id,
				name as account_name,
				type as account_type,
				COUNT(*) as total_count,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as income_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as net
			FROM filtered
			GROUP BY id, name, type
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

	rows, err := sr.pgx.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		return models.SummaryAccountListModel{}, huma.Error422UnprocessableEntity("query account summary: %w", err)
	}
	defer rows.Close()

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
			return models.SummaryAccountListModel{}, huma.Error422UnprocessableEntity("scan account summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryAccountModel{}
	}

	return models.SummaryAccountListModel{
		Items: items,
	}, nil
}

func (sr SummaryRepository) GetCategorySummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryCategoryListModel, error) {
	sql := `
		WITH filtered AS (
			SELECT 
				c.id,
				c.name,
				c.type,
				t.amount
			FROM transactions t
			JOIN categories c ON t.category_id = c.id
			WHERE t.deleted_at IS NULL 
				AND c.deleted_at IS NULL
				AND ($1::timestamp IS NULL OR t.date >= $1)
				AND ($2::timestamp IS NULL OR t.date <= $2)
		),
		summary AS (
			SELECT 
				id as category_id,
				name as category_name,
				type as category_type,
				COUNT(*) as total_count,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as income_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as net
			FROM filtered
			GROUP BY id, name, type
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

	rows, err := sr.pgx.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		return models.SummaryCategoryListModel{}, huma.Error422UnprocessableEntity("query category summary: %w", err)
	}
	defer rows.Close()

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
			return models.SummaryCategoryListModel{}, huma.Error422UnprocessableEntity("scan category summary: %w", err)
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
