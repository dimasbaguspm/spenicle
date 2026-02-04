package repositories

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
)

type CategoryStatisticsRepository struct {
	db DBQuerier
}

// CatStatRepository is a shorter alias for CategoryStatisticsRepository
type CatStatRepository = CategoryStatisticsRepository

func NewCategoryStatisticsRepository(db DBQuerier) CategoryStatisticsRepository {
	return CategoryStatisticsRepository{db}
}

// calculatePercentage returns percentage as float64, handling division by zero
func calculatePercentage(part, total int64) float64 {
	if total == 0 {
		return 0.0
	}
	return (float64(part) / float64(total)) * 100.0
}

// GetSpendingVelocity returns spending trend over the period (line chart data - daily data points)
func (sr CategoryStatisticsRepository) GetSpendingVelocity(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticSpendingVelocityModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH transaction_impacts AS (
			SELECT
				date::date as period,
				type as transaction_type,
				amount,
				CASE
					WHEN type = 'income' THEN amount
					WHEN type = 'expense' THEN -amount
					ELSE 0
				END as net_impact
			FROM transactions
			WHERE category_id = $1
				AND deleted_at IS NULL
				AND date >= $2::timestamptz
				AND date <= $3::timestamptz
		),
		daily_data AS (
			SELECT
				period,
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE transaction_type = 'income') as income_count,
				COUNT(*) FILTER (WHERE transaction_type = 'expense') as expense_count,
				COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) as income_amount,
				COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(net_impact), 0) as net
			FROM transaction_impacts
			GROUP BY period
		)
		SELECT
			period,
			total_count,
			income_count,
			expense_count,
			income_amount,
			expense_amount,
			net
		FROM daily_data
		ORDER BY period ASC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.CategoryStatisticSpendingVelocityModel{}, huma.Error500InternalServerError("query spending velocity: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var data []models.CategoryStatisticSpendingVelocityDataPoint
	for rows.Next() {
		var period time.Time
		var totalCount, incomeCount, expenseCount, incomeAmount, expenseAmount, net int64

		if err := rows.Scan(&period, &totalCount, &incomeCount, &expenseCount, &incomeAmount, &expenseAmount, &net); err != nil {
			return models.CategoryStatisticSpendingVelocityModel{}, huma.Error500InternalServerError("scan velocity row: %w", err)
		}

		totalVolume := incomeAmount + expenseAmount
		data = append(data, models.CategoryStatisticSpendingVelocityDataPoint{
			Month:            period.Format("2006-01-02"),
			Amount:           expenseAmount,
			TotalCount:       int(totalCount),
			IncomeCount:      int(incomeCount),
			ExpenseCount:     int(expenseCount),
			IncomeAmount:     incomeAmount,
			ExpenseAmount:    expenseAmount,
			Net:              net,
			IncomePercentage: calculatePercentage(incomeAmount, totalVolume),
		})
	}

	// Calculate aggregates and trend
	var totalIncome, totalExpense int64
	for _, dp := range data {
		totalIncome += dp.IncomeAmount
		totalExpense += dp.ExpenseAmount
	}

	trendDirection := "stable"
	if len(data) >= 2 {
		recent := data[len(data)-1].ExpenseAmount
		older := data[0].ExpenseAmount
		if recent > older*110/100 {
			trendDirection = "increasing"
		} else if recent < older*90/100 {
			trendDirection = "decreasing"
		}
	}

	avgMonthlySpend := int64(0)
	if len(data) > 0 {
		avgMonthlySpend = totalExpense / int64(len(data))
	}

	return models.CategoryStatisticSpendingVelocityModel{
		Data:                data,
		TotalIncome:         totalIncome,
		TotalExpense:        totalExpense,
		NetFlow:             totalIncome - totalExpense,
		TrendDirection:      trendDirection,
		AverageMonthlySpend: avgMonthlySpend,
	}, nil
}

// GetAccountDistribution returns which accounts pay for this category
func (sr CategoryStatisticsRepository) GetAccountDistribution(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAccountDistributionModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH account_spending AS (
			SELECT
				a.id as account_id,
				a.name as account_name,
				COALESCE(SUM(t.amount), 0) as total_amount
			FROM accounts a
			LEFT JOIN transactions t ON t.account_id = a.id
				AND t.category_id = $1
				AND t.deleted_at IS NULL
				AND t.type = 'expense'
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
			WHERE a.deleted_at IS NULL
			GROUP BY a.id, a.name
		),
		totals AS (
			SELECT COALESCE(SUM(total_amount), 0) as total_spending
			FROM account_spending
		)
		SELECT
			acc.account_id,
			acc.account_name,
			acc.total_amount,
			CASE
				WHEN t.total_spending = 0 THEN 0
				ELSE ROUND((acc.total_amount::numeric / t.total_spending) * 100, 2)
			END as percentage_of_total,
			t.total_spending
		FROM account_spending acc
		CROSS JOIN totals t
		WHERE acc.total_amount > 0
		ORDER BY acc.total_amount DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.CategoryStatisticAccountDistributionModel{}, huma.Error500InternalServerError("query account distribution: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "accounts", time.Since(queryStart).Seconds())

	var items []models.CategoryStatisticAccountDistributionEntry
	var totalSpending int64

	for rows.Next() {
		var item models.CategoryStatisticAccountDistributionEntry
		var percentage float64

		if err := rows.Scan(&item.AccountID, &item.AccountName, &item.Amount, &percentage, &totalSpending); err != nil {
			return models.CategoryStatisticAccountDistributionModel{}, huma.Error500InternalServerError("scan distribution row: %w", err)
		}

		item.Percentage = percentage
		items = append(items, item)
	}

	return models.CategoryStatisticAccountDistributionModel{
		Accounts:      items,
		TotalSpending: totalSpending,
	}, nil
}

// GetAverageTransactionSize returns typical transaction amounts
func (sr CategoryStatisticsRepository) GetAverageTransactionSize(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAverageTransactionSizeModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		SELECT
			COUNT(*) FILTER (WHERE type = 'expense') as expense_count,
			COUNT(*) FILTER (WHERE type = 'income') as income_count,
			COALESCE(AVG(amount) FILTER (WHERE type = 'expense'), 0)::bigint as avg_expense,
			COALESCE(MIN(amount) FILTER (WHERE type = 'expense'), 0) as min_expense,
			COALESCE(MAX(amount) FILTER (WHERE type = 'expense'), 0) as max_expense,
			COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) FILTER (WHERE type = 'expense'), 0)::bigint as median_expense,
			COALESCE(AVG(amount) FILTER (WHERE type = 'income'), 0)::bigint as avg_income,
			COALESCE(MIN(amount) FILTER (WHERE type = 'income'), 0) as min_income,
			COALESCE(MAX(amount) FILTER (WHERE type = 'income'), 0) as max_income,
			COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) FILTER (WHERE type = 'income'), 0)::bigint as median_income
		FROM transactions t
		WHERE t.category_id = $1
			AND t.deleted_at IS NULL
			AND t.date >= $2::timestamptz
			AND t.date <= $3::timestamptz
	`

	var expenseCount, incomeCount int64
	var avgExp, minExp, maxExp, medianExp int64
	var avgInc, minInc, maxInc, medianInc int64

	queryStart := time.Now()
	if err := sr.db.QueryRow(ctx, sql, categoryID, p.StartDate, p.EndDate).Scan(
		&expenseCount, &incomeCount,
		&avgExp, &minExp, &maxExp, &medianExp,
		&avgInc, &minInc, &maxInc, &medianInc,
	); err != nil {
		observability.RecordError("database")
		return models.CategoryStatisticAverageTransactionSizeModel{}, huma.Error500InternalServerError("query average size: %w", err)
	}
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	ratio := 0.0
	if expenseCount > 0 {
		ratio = float64(incomeCount) / float64(expenseCount)
	}

	return models.CategoryStatisticAverageTransactionSizeModel{
		TransactionCount:     expenseCount + incomeCount,
		AverageAmount:        avgExp,
		MinAmount:            minExp,
		MaxAmount:            maxExp,
		MedianAmount:         medianExp,
		ExpenseCount:         expenseCount,
		IncomeCount:          incomeCount,
		AverageIncomeAmount:  avgInc,
		MinIncomeAmount:      minInc,
		MaxIncomeAmount:      maxInc,
		MedianIncomeAmount:   medianInc,
		IncomeToExpenseRatio: ratio,
	}, nil
}

// GetDayOfWeekPattern returns spending by day of week
func (sr CategoryStatisticsRepository) GetDayOfWeekPattern(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticDayOfWeekPatternModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH daily_spending AS (
			SELECT
				EXTRACT(DOW FROM t.date)::int as day_of_week,
				COUNT(*) as transaction_count,
				COUNT(*) FILTER (WHERE type = 'expense') as expense_count,
				COUNT(*) FILTER (WHERE type = 'income') as income_count,
				COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) as expense_total,
				COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) as income_total,
				COALESCE(AVG(amount) FILTER (WHERE type = 'expense'), 0)::bigint as expense_avg,
				COALESCE(AVG(amount) FILTER (WHERE type = 'income'), 0)::bigint as income_avg
			FROM transactions t
			WHERE t.category_id = $1
				AND t.deleted_at IS NULL
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
			GROUP BY EXTRACT(DOW FROM t.date)
		),
		all_days AS (
			SELECT day::int as day_of_week FROM generate_series(0, 6) as t(day)
		)
		SELECT
			ad.day_of_week,
			COALESCE(ds.transaction_count, 0) as transaction_count,
			COALESCE(ds.expense_count, 0) as expense_count,
			COALESCE(ds.income_count, 0) as income_count,
			COALESCE(ds.expense_total, 0) as expense_total,
			COALESCE(ds.income_total, 0) as income_total,
			COALESCE(ds.expense_avg, 0) as expense_avg,
			COALESCE(ds.income_avg, 0) as income_avg
		FROM all_days ad
		LEFT JOIN daily_spending ds ON ad.day_of_week = ds.day_of_week
		ORDER BY ad.day_of_week
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.CategoryStatisticDayOfWeekPatternModel{}, huma.Error500InternalServerError("query day of week pattern: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var data []models.CategoryStatisticDayOfWeekPatternEntry
	dayNames := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

	for rows.Next() {
		var dayOfWeek int
		var txCount, expCount, incCount int64
		var expTotal, incTotal, expAvg, incAvg int64

		if err := rows.Scan(&dayOfWeek, &txCount, &expCount, &incCount, &expTotal, &incTotal, &expAvg, &incAvg); err != nil {
			return models.CategoryStatisticDayOfWeekPatternModel{}, huma.Error500InternalServerError("scan day of week row: %w", err)
		}

		data = append(data, models.CategoryStatisticDayOfWeekPatternEntry{
			DayOfWeek:        dayNames[dayOfWeek],
			TransactionCount: txCount,
			TotalAmount:      expTotal,
			AverageAmount:    expAvg,
			ExpenseCount:     expCount,
			IncomeCount:      incCount,
			ExpenseTotal:     expTotal,
			IncomeTotal:      incTotal,
			ExpenseAverage:   expAvg,
			IncomeAverage:    incAvg,
		})
	}

	// Calculate metadata
	mostActiveDay := ""
	highestSpendDay := ""
	maxCount := int64(0)
	maxSpend := int64(0)
	totalTx := 0

	for _, entry := range data {
		totalTx += int(entry.TransactionCount)
		if entry.TransactionCount > maxCount {
			maxCount = entry.TransactionCount
			mostActiveDay = entry.DayOfWeek
		}
		if entry.ExpenseTotal > maxSpend {
			maxSpend = entry.ExpenseTotal
			highestSpendDay = entry.DayOfWeek
		}
	}

	return models.CategoryStatisticDayOfWeekPatternModel{
		Data:              data,
		MostActiveDay:     mostActiveDay,
		HighestSpendDay:   highestSpendDay,
		TotalTransactions: totalTx,
	}, nil
}

// GetBudgetUtilization returns budget progress for this category
func (sr CategoryStatisticsRepository) GetBudgetUtilization(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticBudgetUtilizationModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// Get active budgets for this category
	sql := `
		SELECT
			b.id,
			b.name,
			b.amount_limit,
			b.period_start,
			b.period_end,
			COALESCE(SUM(t.amount), 0) as spent_amount
		FROM budgets b
		LEFT JOIN transactions t ON t.category_id = b.category_id
			AND t.account_id = b.account_id
			AND t.type = 'expense'
			AND t.deleted_at IS NULL
			AND t.date >= b.period_start
			AND t.date <= b.period_end
		WHERE b.category_id = $1
			AND b.deleted_at IS NULL
			AND b.period_start <= $3::timestamptz
			AND b.period_end >= $2::timestamptz
		GROUP BY b.id, b.name, b.amount_limit, b.period_start, b.period_end
		ORDER BY b.period_start DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.CategoryStatisticBudgetUtilizationModel{}, huma.Error500InternalServerError("query budget utilization: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(queryStart).Seconds())

	var items []models.CategoryStatisticBudgetUtilizationEntry
	for rows.Next() {
		var budgetID int64
		var name string
		var limit, spent int64
		var periodStart, periodEnd time.Time

		if err := rows.Scan(&budgetID, &name, &limit, &periodStart, &periodEnd, &spent); err != nil {
			return models.CategoryStatisticBudgetUtilizationModel{}, huma.Error500InternalServerError("scan budget row: %w", err)
		}

		utilization := 0.0
		if limit > 0 {
			utilization = (float64(spent) / float64(limit)) * 100
		}
		remaining := limit - spent
		if remaining < 0 {
			remaining = 0
		}

		items = append(items, models.CategoryStatisticBudgetUtilizationEntry{
			BudgetID:    budgetID,
			Name:        name,
			Limit:       limit,
			Spent:       spent,
			Remaining:   remaining,
			Utilization: utilization,
			PeriodStart: periodStart,
			PeriodEnd:   periodEnd,
		})
	}

	return models.CategoryStatisticBudgetUtilizationModel{
		Budgets: items,
	}, nil
}
