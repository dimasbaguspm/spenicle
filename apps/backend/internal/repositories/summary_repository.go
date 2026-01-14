package repositories

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SummaryRepository struct {
	pgx *pgxpool.Pool
}

func NewSummaryRepository(pgx *pgxpool.Pool) SummaryRepository {
	return SummaryRepository{pgx}
}

// GetTransactionSummary returns transaction summary grouped by frequency (daily, weekly, monthly, yearly).
// Uses efficient SQL with GROUP BY and aggregations.
// Always returns all periods between startDate and endDate with zero values for periods without transactions.
func (sr SummaryRepository) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionRequestModel) (models.SummaryTransactionResponseModel, error) {
	// Generate all periods between start and end dates
	allPeriods := utils.GeneratePeriods(*p.StartDate, *p.EndDate, p.Frequency)

	// Determine the date format and grouping based on frequency
	var dateFormat string
	switch p.Frequency {
	case "daily":
		dateFormat = "TO_CHAR(date, 'YYYY-MM-DD')"
	case "weekly":
		dateFormat = "TO_CHAR(date, 'IYYY-\"W\"IW')" // ISO week format
	case "yearly":
		dateFormat = "TO_CHAR(date, 'YYYY')"
	default: // monthly
		dateFormat = "TO_CHAR(date, 'YYYY-MM')"
	}

	// Build WHERE clause for date filtering - now always required
	sql := fmt.Sprintf(`
		SELECT 
			%s as period,
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
		ORDER BY period DESC
	`, dateFormat)

	rows, err := sr.pgx.Query(ctx, sql, p.StartDate, p.EndDate)
	if err != nil {
		return models.SummaryTransactionResponseModel{}, fmt.Errorf("query transaction summary: %w", err)
	}
	defer rows.Close()

	// Build map of existing data
	dataMap := make(map[string]models.SummaryTransactionItem)
	for rows.Next() {
		var item models.SummaryTransactionItem
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
			return models.SummaryTransactionResponseModel{}, fmt.Errorf("scan transaction summary: %w", err)
		}
		dataMap[item.Period] = item
	}

	// Fill in missing periods with zero values
	items := make([]models.SummaryTransactionItem, 0, len(allPeriods))
	for i := len(allPeriods) - 1; i >= 0; i-- { // Reverse to get DESC order
		period := allPeriods[i]
		if item, exists := dataMap[period]; exists {
			items = append(items, item)
		} else {
			// Create zero-value item for missing period
			items = append(items, models.SummaryTransactionItem{
				Period:         period,
				TotalCount:     0,
				IncomeCount:    0,
				ExpenseCount:   0,
				TransferCount:  0,
				IncomeAmount:   0,
				ExpenseAmount:  0,
				TransferAmount: 0,
				Net:            0,
			})
		}
	}

	return models.SummaryTransactionResponseModel{
		Frequency: p.Frequency,
		Data:      items,
	}, nil
}

// GetAccountSummary returns transaction summary grouped by account.
// Uses efficient SQL with JOIN and GROUP BY.
// Filters by date range if provided.
func (sr SummaryRepository) GetAccountSummary(ctx context.Context, p models.SummaryRequestModel) (models.SummaryAccountResponseModel, error) {
	// Build WHERE clause for date filtering
	var whereClause string
	var args []interface{}
	argCount := 0
	whereClause = "WHERE t.deleted_at IS NULL AND a.deleted_at IS NULL"

	if p.StartDate != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date >= $%d", argCount)
		args = append(args, *p.StartDate)
	}
	if p.EndDate != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date <= $%d", argCount)
		args = append(args, *p.EndDate)
	}

	// Efficient SQL query with JOIN and conditional aggregation
	sql := fmt.Sprintf(`
		SELECT 
			a.id as account_id,
			a.name as account_name,
			a.type as account_type,
			COUNT(*) as total_count,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		%s
		GROUP BY a.id, a.name, a.type
		ORDER BY total_count DESC
	`, whereClause)

	rows, err := sr.pgx.Query(ctx, sql, args...)
	if err != nil {
		return models.SummaryAccountResponseModel{}, fmt.Errorf("query account summary: %w", err)
	}
	defer rows.Close()

	var items []models.SummaryAccountItem
	for rows.Next() {
		var item models.SummaryAccountItem
		if err := rows.Scan(
			&item.AccountID,
			&item.AccountName,
			&item.AccountType,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return models.SummaryAccountResponseModel{}, fmt.Errorf("scan account summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryAccountItem{}
	}

	return models.SummaryAccountResponseModel{
		Data: items,
	}, nil
}

// GetCategorySummary returns transaction summary grouped by category.
// Uses efficient SQL with JOIN and GROUP BY.
// Filters by date range if provided.
func (sr SummaryRepository) GetCategorySummary(ctx context.Context, p models.SummaryRequestModel) (models.SummaryCategoryResponseModel, error) {
	// Build WHERE clause for date filtering
	var whereClause string
	var args []interface{}
	argCount := 0
	whereClause = "WHERE t.deleted_at IS NULL AND c.deleted_at IS NULL"

	if p.StartDate != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date >= $%d", argCount)
		args = append(args, *p.StartDate)
	}
	if p.EndDate != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date <= $%d", argCount)
		args = append(args, *p.EndDate)
	}

	// Efficient SQL query with JOIN and conditional aggregation
	sql := fmt.Sprintf(`
		SELECT 
			c.id as category_id,
			c.name as category_name,
			c.type as category_type,
			COUNT(*) as total_count,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net
		FROM transactions t
		JOIN categories c ON t.category_id = c.id
		%s
		GROUP BY c.id, c.name, c.type
		ORDER BY total_count DESC
	`, whereClause)

	rows, err := sr.pgx.Query(ctx, sql, args...)
	if err != nil {
		return models.SummaryCategoryResponseModel{}, fmt.Errorf("query category summary: %w", err)
	}
	defer rows.Close()

	var items []models.SummaryCategoryItem
	for rows.Next() {
		var item models.SummaryCategoryItem
		if err := rows.Scan(
			&item.CategoryID,
			&item.CategoryName,
			&item.CategoryType,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return models.SummaryCategoryResponseModel{}, fmt.Errorf("scan category summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.SummaryCategoryItem{}
	}

	return models.SummaryCategoryResponseModel{
		Data: items,
	}, nil
}
