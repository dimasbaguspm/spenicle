package repositories

import (
	"context"
	"fmt"
	"strings"

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

// GetAccountTrend returns trend analysis for accounts over time
func (r *SummaryRepository) GetAccountTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
	// Determine the date format based on frequency
	var dateFormat string
	switch params.Frequency {
	case "weekly":
		dateFormat = "TO_CHAR(date, 'IYYY-\"W\"IW')"
	default: // monthly
		dateFormat = "TO_CHAR(date, 'YYYY-MM')"
	}

	// Query to get period data per account
	sql := fmt.Sprintf(`
		SELECT 
			a.id as account_id,
			a.name as account_name,
			%s as period,
			COALESCE(SUM(t.amount), 0) as total_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'transfer'), 0) as transfer_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net,
			COUNT(*) as count
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id
		WHERE t.deleted_at IS NULL 
			AND a.deleted_at IS NULL
			AND t.date >= $1 
			AND t.date <= $2
		GROUP BY a.id, a.name, period
		ORDER BY a.id, period ASC
	`, dateFormat)

	rows, err := r.db.Query(ctx, sql, params.StartDate, params.EndDate)
	if err != nil {
		return schemas.AccountTrendSchema{}, fmt.Errorf("query account trend: %w", err)
	}
	defer rows.Close()

	// Group data by account
	accountMap := make(map[int64]*schemas.AccountTrendItem)
	var accountIDs []int64

	for rows.Next() {
		var accountID int64
		var accountName, period string
		var totalAmount, incomeAmount, expenseAmount, transferAmount, net int64
		var count int

		if err := rows.Scan(&accountID, &accountName, &period, &totalAmount, &incomeAmount, &expenseAmount, &transferAmount, &net, &count); err != nil {
			return schemas.AccountTrendSchema{}, fmt.Errorf("scan account trend: %w", err)
		}

		if _, exists := accountMap[accountID]; !exists {
			accountMap[accountID] = &schemas.AccountTrendItem{
				AccountID:   accountID,
				AccountName: accountName,
				Periods:     []schemas.TrendItem{},
			}
			accountIDs = append(accountIDs, accountID)
		}

		accountMap[accountID].Periods = append(accountMap[accountID].Periods, schemas.TrendItem{
			Period:         period,
			TotalAmount:    totalAmount,
			IncomeAmount:   incomeAmount,
			ExpenseAmount:  expenseAmount,
			TransferAmount: transferAmount,
			Net:            net,
			Count:          count,
		})
	}

	// Calculate trends and changes for each account
	var data []schemas.AccountTrendItem
	for _, accountID := range accountIDs {
		item := accountMap[accountID]
		calculateTrendMetrics(item.Periods)
		item.AvgChange, item.TrendStatus = calculateOverallTrend(item.Periods)
		data = append(data, *item)
	}

	if data == nil {
		data = []schemas.AccountTrendItem{}
	}

	return schemas.AccountTrendSchema{
		Frequency: params.Frequency,
		StartDate: params.StartDate,
		EndDate:   params.EndDate,
		Data:      data,
	}, nil
}

// GetCategoryTrend returns trend analysis for categories over time
func (r *SummaryRepository) GetCategoryTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
	// Determine the date format based on frequency
	var dateFormat string
	switch params.Frequency {
	case "weekly":
		dateFormat = "TO_CHAR(date, 'IYYY-\"W\"IW')"
	default: // monthly
		dateFormat = "TO_CHAR(date, 'YYYY-MM')"
	}

	// Query to get period data per category
	sql := fmt.Sprintf(`
		SELECT 
			c.id as category_id,
			c.name as category_name,
			c.type as category_type,
			%s as period,
			COALESCE(SUM(t.amount), 0) as total_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'transfer'), 0) as transfer_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as net,
			COUNT(*) as count
		FROM transactions t
		JOIN categories c ON t.category_id = c.id
		WHERE t.deleted_at IS NULL 
			AND c.deleted_at IS NULL
			AND t.date >= $1 
			AND t.date <= $2
		GROUP BY c.id, c.name, c.type, period
		ORDER BY c.id, period ASC
	`, dateFormat)

	rows, err := r.db.Query(ctx, sql, params.StartDate, params.EndDate)
	if err != nil {
		return schemas.CategoryTrendSchema{}, fmt.Errorf("query category trend: %w", err)
	}
	defer rows.Close()

	// Group data by category
	categoryMap := make(map[int64]*schemas.CategoryTrendItem)
	var categoryIDs []int64

	for rows.Next() {
		var categoryID int64
		var categoryName, categoryType, period string
		var totalAmount, incomeAmount, expenseAmount, transferAmount, net int64
		var count int

		if err := rows.Scan(&categoryID, &categoryName, &categoryType, &period, &totalAmount, &incomeAmount, &expenseAmount, &transferAmount, &net, &count); err != nil {
			return schemas.CategoryTrendSchema{}, fmt.Errorf("scan category trend: %w", err)
		}

		if _, exists := categoryMap[categoryID]; !exists {
			categoryMap[categoryID] = &schemas.CategoryTrendItem{
				CategoryID:   categoryID,
				CategoryName: categoryName,
				CategoryType: categoryType,
				Periods:      []schemas.TrendItem{},
			}
			categoryIDs = append(categoryIDs, categoryID)
		}

		categoryMap[categoryID].Periods = append(categoryMap[categoryID].Periods, schemas.TrendItem{
			Period:         period,
			TotalAmount:    totalAmount,
			IncomeAmount:   incomeAmount,
			ExpenseAmount:  expenseAmount,
			TransferAmount: transferAmount,
			Net:            net,
			Count:          count,
		})
	}

	// Calculate trends and changes for each category
	var data []schemas.CategoryTrendItem
	for _, categoryID := range categoryIDs {
		item := categoryMap[categoryID]
		calculateTrendMetrics(item.Periods)
		item.AvgChange, item.TrendStatus = calculateOverallTrend(item.Periods)
		data = append(data, *item)
	}

	if data == nil {
		data = []schemas.CategoryTrendItem{}
	}

	return schemas.CategoryTrendSchema{
		Frequency: params.Frequency,
		StartDate: params.StartDate,
		EndDate:   params.EndDate,
		Data:      data,
	}, nil
}

// calculateTrendMetrics calculates change percent and trend direction for each period
func calculateTrendMetrics(periods []schemas.TrendItem) {
	for i := range periods {
		if i == 0 {
			periods[i].ChangePercent = 0
			periods[i].Trend = "stable"
			continue
		}

		prev := periods[i-1].TotalAmount
		curr := periods[i].TotalAmount

		if prev == 0 {
			if curr > 0 {
				periods[i].ChangePercent = 100
				periods[i].Trend = "increasing"
			} else {
				periods[i].ChangePercent = 0
				periods[i].Trend = "stable"
			}
		} else {
			change := float64(curr-prev) / float64(prev) * 100
			periods[i].ChangePercent = change

			if change > 5 {
				periods[i].Trend = "increasing"
			} else if change < -5 {
				periods[i].Trend = "decreasing"
			} else {
				periods[i].Trend = "stable"
			}
		}
	}
}

// calculateOverallTrend calculates average change and overall trend status
func calculateOverallTrend(periods []schemas.TrendItem) (float64, string) {
	if len(periods) <= 1 {
		return 0, "stable"
	}

	var totalChange float64
	var validChanges int
	increasingCount := 0
	decreasingCount := 0

	for i := 1; i < len(periods); i++ {
		totalChange += periods[i].ChangePercent
		validChanges++

		if periods[i].Trend == "increasing" {
			increasingCount++
		} else if periods[i].Trend == "decreasing" {
			decreasingCount++
		}
	}

	avgChange := 0.0
	if validChanges > 0 {
		avgChange = totalChange / float64(validChanges)
	}

	// Determine overall trend status
	status := "stable"
	if increasingCount > decreasingCount*2 {
		status = "increasing"
	} else if decreasingCount > increasingCount*2 {
		status = "decreasing"
	} else if increasingCount > 0 && decreasingCount > 0 {
		status = "volatile"
	}

	return avgChange, status
}

// GetTagSummary returns aggregated transaction data grouped by tags
func (r *SummaryRepository) GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error) {
	// Build base query
	baseQuery := `
		FROM transactions t
		INNER JOIN transaction_tags tt ON t.id = tt.transaction_id
		INNER JOIN tags tg ON tt.tag_id = tg.id
		WHERE t.deleted_at IS NULL
	`

	// Build filters
	filters := []string{}
	args := []interface{}{}
	argIndex := 1

	// Date filters
	if !params.StartDate.IsZero() {
		filters = append(filters, fmt.Sprintf("t.date >= $%d", argIndex))
		args = append(args, params.StartDate)
		argIndex++
	}

	if !params.EndDate.IsZero() {
		filters = append(filters, fmt.Sprintf("t.date <= $%d", argIndex))
		args = append(args, params.EndDate)
		argIndex++
	}

	// Type filter
	if params.Type != "" {
		filters = append(filters, fmt.Sprintf("t.type = $%d", argIndex))
		args = append(args, params.Type)
		argIndex++
	}

	// Account IDs filter
	if len(params.AccountIDs) > 0 {
		accountPlaceholders := make([]string, len(params.AccountIDs))
		for i, id := range params.AccountIDs {
			accountPlaceholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, id)
			argIndex++
		}
		filters = append(filters, fmt.Sprintf("t.account_id IN (%s)", strings.Join(accountPlaceholders, ", ")))
	}

	// Category IDs filter
	if len(params.CategoryIDs) > 0 {
		categoryPlaceholders := make([]string, len(params.CategoryIDs))
		for i, id := range params.CategoryIDs {
			categoryPlaceholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, id)
			argIndex++
		}
		filters = append(filters, fmt.Sprintf("t.category_id IN (%s)", strings.Join(categoryPlaceholders, ", ")))
	}

	// Tag names filter
	if len(params.TagNames) > 0 {
		tagPlaceholders := make([]string, len(params.TagNames))
		for i, name := range params.TagNames {
			tagPlaceholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, name)
			argIndex++
		}
		filters = append(filters, fmt.Sprintf("LOWER(tg.name) IN (%s)", strings.Join(tagPlaceholders, ", ")))
	}

	whereClause := baseQuery
	if len(filters) > 0 {
		whereClause += " AND " + strings.Join(filters, " AND ")
	}

	// Build summary query
	summarySQL := `
		SELECT 
			tg.id,
			tg.name,
			COUNT(*) as total_count,
			COUNT(*) FILTER (WHERE t.type = 'income') as income_count,
			COUNT(*) FILTER (WHERE t.type = 'expense') as expense_count,
			COUNT(*) FILTER (WHERE t.type = 'transfer') as transfer_count,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) as income_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'transfer'), 0) as transfer_amount
	` + whereClause + `
		GROUP BY tg.id, tg.name
		ORDER BY tg.name
	`

	rows, err := r.db.Query(ctx, summarySQL, args...)
	if err != nil {
		return schemas.SummaryTagSchema{}, fmt.Errorf("get tag summary: %w", err)
	}
	defer rows.Close()

	var items []schemas.SummaryTagitem
	for rows.Next() {
		var item schemas.SummaryTagitem
		if err := rows.Scan(
			&item.TagID,
			&item.TagName,
			&item.TotalCount,
			&item.IncomeCount,
			&item.ExpenseCount,
			&item.TransferCount,
			&item.IncomeAmount,
			&item.ExpenseAmount,
			&item.TransferAmount,
		); err != nil {
			return schemas.SummaryTagSchema{}, fmt.Errorf("scan tag summary: %w", err)
		}

		// Calculate net: income - expense
		item.Net = item.IncomeAmount - item.ExpenseAmount

		items = append(items, item)
	}

	if items == nil {
		items = []schemas.SummaryTagitem{}
	}

	return schemas.SummaryTagSchema{Data: items}, nil
}
