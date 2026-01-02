package repositories

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

type SummaryRepository struct {
	db DB
}

func NewSummaryRepository(db DB) *SummaryRepository {
	return &SummaryRepository{db: db}
}

// GetTransactionSummary returns transaction summary grouped by frequency (daily, weekly, monthly, yearly).
// Uses efficient SQL with GROUP BY and aggregations.
// Filters by date range if provided.
func (r *SummaryRepository) GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
	// Determine the date format and grouping based on frequency
	var dateFormat string
	switch params.Frequency {
	case "daily":
		dateFormat = "TO_CHAR(date, 'YYYY-MM-DD')"
	case "weekly":
		dateFormat = "TO_CHAR(date, 'IYYY-\"W\"IW')" // ISO week format
	case "yearly":
		dateFormat = "TO_CHAR(date, 'YYYY')"
	default: // monthly
		dateFormat = "TO_CHAR(date, 'YYYY-MM')"
	}

	// Build WHERE clause for date filtering
	var whereClause string
	var args []interface{}
	argCount := 0
	whereClause = "WHERE deleted_at IS NULL"

	if !params.StartDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND date >= $%d", argCount)
		args = append(args, params.StartDate)
	}
	if !params.EndDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND date <= $%d", argCount)
		args = append(args, params.EndDate)
	}

	// Efficient SQL query using CASE statements for conditional aggregation
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
		%s
		GROUP BY period
		ORDER BY period DESC
	`, dateFormat, whereClause)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.SummaryTransactionSchema{}, fmt.Errorf("query transaction summary: %w", err)
	}
	defer rows.Close()

	var items []schemas.SummaryTransactionItem
	for rows.Next() {
		var item schemas.SummaryTransactionItem
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
			return schemas.SummaryTransactionSchema{}, fmt.Errorf("scan transaction summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []schemas.SummaryTransactionItem{}
	}

	return schemas.SummaryTransactionSchema{
		Frequency: params.Frequency,
		Data:      items,
	}, nil
}

// GetAccountSummary returns transaction summary grouped by account.
// Uses efficient SQL with JOIN and GROUP BY.
// Filters by date range if provided.
func (r *SummaryRepository) GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
	// Build WHERE clause for date filtering
	var whereClause string
	var args []interface{}
	argCount := 0
	whereClause = "WHERE t.deleted_at IS NULL AND a.deleted_at IS NULL"

	if !params.StartDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date >= $%d", argCount)
		args = append(args, params.StartDate)
	}
	if !params.EndDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date <= $%d", argCount)
		args = append(args, params.EndDate)
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

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.SummaryAccountSchema{}, fmt.Errorf("query account summary: %w", err)
	}
	defer rows.Close()

	var items []schemas.SummaryAccountModel
	for rows.Next() {
		var item schemas.SummaryAccountModel
		if err := rows.Scan(
			&item.AccountID,
			&item.AccountName,
			&item.AccountType,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return schemas.SummaryAccountSchema{}, fmt.Errorf("scan account summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []schemas.SummaryAccountModel{}
	}

	return schemas.SummaryAccountSchema{
		Data: items,
	}, nil
}

// GetCategorySummary returns transaction summary grouped by category.
// Uses efficient SQL with JOIN and GROUP BY.
// Filters by date range if provided.
func (r *SummaryRepository) GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
	// Build WHERE clause for date filtering
	var whereClause string
	var args []interface{}
	argCount := 0
	whereClause = "WHERE t.deleted_at IS NULL AND c.deleted_at IS NULL"

	if !params.StartDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date >= $%d", argCount)
		args = append(args, params.StartDate)
	}
	if !params.EndDate.IsZero() {
		argCount++
		whereClause += fmt.Sprintf(" AND t.date <= $%d", argCount)
		args = append(args, params.EndDate)
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

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.SummaryCategorySchema{}, fmt.Errorf("query category summary: %w", err)
	}
	defer rows.Close()

	var items []schemas.SummaryCategoryModel
	for rows.Next() {
		var item schemas.SummaryCategoryModel
		if err := rows.Scan(
			&item.CategoryID,
			&item.CategoryName,
			&item.CategoryType,
			&item.TotalCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.Net,
		); err != nil {
			return schemas.SummaryCategorySchema{}, fmt.Errorf("scan category summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []schemas.SummaryCategoryModel{}
	}

	return schemas.SummaryCategorySchema{
		Data: items,
	}, nil
}
