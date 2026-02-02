package repositories

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
)

type CategoryStatisticsRepository struct {
	db DBQuerier
}

// CatStatRepository is a shorter alias for CategoryStatisticsRepository
type CatStatRepository = CategoryStatisticsRepository

func NewCategoryStatisticsRepository(db DBQuerier) CategoryStatisticsRepository {
	return CategoryStatisticsRepository{db}
}

// GetSpendingVelocity returns spending trend over the period (line chart data)
func (sr CategoryStatisticsRepository) GetSpendingVelocity(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticSpendingVelocityModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH monthly_spending AS (
			SELECT
				DATE_TRUNC('month', t.date)::date as month,
				SUM(t.amount) as amount
			FROM transactions t
			WHERE t.category_id = $1
				AND t.type = 'expense'
				AND t.deleted_at IS NULL
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
			GROUP BY DATE_TRUNC('month', t.date)
			ORDER BY month
		)
		SELECT month, amount FROM monthly_spending
	`

	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		return models.CategoryStatisticSpendingVelocityModel{}, huma.Error500InternalServerError("query spending velocity: %w", err)
	}
	defer rows.Close()

	var data []models.CategoryStatisticSpendingVelocityDataPoint
	for rows.Next() {
		var month time.Time
		var amount int64

		if err := rows.Scan(&month, &amount); err != nil {
			return models.CategoryStatisticSpendingVelocityModel{}, huma.Error500InternalServerError("scan velocity row: %w", err)
		}

		data = append(data, models.CategoryStatisticSpendingVelocityDataPoint{
			Month:  month.Format("2006-01"),
			Amount: amount,
		})
	}

	return models.CategoryStatisticSpendingVelocityModel{
		Data: data,
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
				AND t.type = 'expense'
				AND t.deleted_at IS NULL
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

	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		return models.CategoryStatisticAccountDistributionModel{}, huma.Error500InternalServerError("query account distribution: %w", err)
	}
	defer rows.Close()

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
			COUNT(t.id) as transaction_count,
			COALESCE(AVG(t.amount), 0)::bigint as average_amount,
			MIN(t.amount) as min_amount,
			MAX(t.amount) as max_amount,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.amount) as median_amount
		FROM transactions t
		WHERE t.category_id = $1
			AND t.type = 'expense'
			AND t.deleted_at IS NULL
			AND t.date >= $2::timestamptz
			AND t.date <= $3::timestamptz
	`

	var count int64
	var avg, min, max, median int64

	if err := sr.db.QueryRow(ctx, sql, categoryID, p.StartDate, p.EndDate).Scan(&count, &avg, &min, &max, &median); err != nil {
		return models.CategoryStatisticAverageTransactionSizeModel{}, huma.Error500InternalServerError("query average size: %w", err)
	}

	return models.CategoryStatisticAverageTransactionSizeModel{
		TransactionCount: count,
		AverageAmount:    avg,
		MinAmount:        min,
		MaxAmount:        max,
		MedianAmount:     median,
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
				COUNT(t.id) as transaction_count,
				COALESCE(SUM(t.amount), 0) as total_amount,
				COALESCE(AVG(t.amount), 0)::bigint as average_amount
			FROM transactions t
			WHERE t.category_id = $1
				AND t.type = 'expense'
				AND t.deleted_at IS NULL
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
			GROUP BY EXTRACT(DOW FROM t.date)
		)
		SELECT day_of_week, transaction_count, total_amount, average_amount
		FROM daily_spending
		ORDER BY day_of_week
	`

	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		return models.CategoryStatisticDayOfWeekPatternModel{}, huma.Error500InternalServerError("query day of week pattern: %w", err)
	}
	defer rows.Close()

	var data []models.CategoryStatisticDayOfWeekPatternEntry
	dayNames := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

	for rows.Next() {
		var dayOfWeek int
		var txCount, total, avg int64

		if err := rows.Scan(&dayOfWeek, &txCount, &total, &avg); err != nil {
			return models.CategoryStatisticDayOfWeekPatternModel{}, huma.Error500InternalServerError("scan day of week row: %w", err)
		}

		data = append(data, models.CategoryStatisticDayOfWeekPatternEntry{
			DayOfWeek:        dayNames[dayOfWeek],
			TransactionCount: txCount,
			TotalAmount:      total,
			AverageAmount:    avg,
		})
	}

	return models.CategoryStatisticDayOfWeekPatternModel{
		Data: data,
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
		LEFT JOIN transactions t ON t.category_id = $1
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

	rows, err := sr.db.Query(ctx, sql, categoryID, p.StartDate, p.EndDate)
	if err != nil {
		return models.CategoryStatisticBudgetUtilizationModel{}, huma.Error500InternalServerError("query budget utilization: %w", err)
	}
	defer rows.Close()

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
