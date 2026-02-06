package repositories

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
)

type AccountStatisticsRepository struct {
	db DBQuerier
}

// AccStatRepository is a shorter alias for AccountStatisticsRepository
type AccStatRepository = AccountStatisticsRepository

func NewAccountStatisticsRepository(db DBQuerier) AccountStatisticsRepository {
	return AccountStatisticsRepository{db}
}

// GetCategoryHeatmap returns spending distribution by category
func (sr AccountStatisticsRepository) GetCategoryHeatmap(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsCategoryHeatmapModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH category_spending AS (
			SELECT
				c.id as category_id,
				c.name as category_name,
				COUNT(t.id) as total_count,
				COALESCE(SUM(t.amount), 0) as total_amount
			FROM categories c
			LEFT JOIN transactions t ON t.category_id = c.id
				AND t.account_id = $1
				AND t.type = 'expense'
				AND t.deleted_at IS NULL
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
			WHERE c.deleted_at IS NULL
			GROUP BY c.id, c.name
		),
		totals AS (
			SELECT COALESCE(SUM(total_amount), 0) as total_spending
			FROM category_spending
		)
		SELECT
			cs.category_id,
			cs.category_name,
			cs.total_count,
			cs.total_amount,
			CASE
				WHEN t.total_spending = 0 THEN 0
				ELSE ROUND((cs.total_amount::numeric / t.total_spending) * 100, 2)
			END as percentage_of_total,
			t.total_spending
		FROM category_spending cs
		CROSS JOIN totals t
		WHERE cs.total_amount > 0
		ORDER BY cs.total_amount DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, accountID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsCategoryHeatmapModel{}, huma.Error500InternalServerError("query category heatmap: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "categories", time.Since(queryStart).Seconds())

	var items []models.AccountStatisticsCategoryHeatmapEntry
	var totalSpending int64
	categoryCount := 0

	for rows.Next() {
		var item models.AccountStatisticsCategoryHeatmapEntry
		var percentage float64
		var totalFromRow int64

		if err := rows.Scan(
			&item.CategoryID,
			&item.CategoryName,
			&item.TotalCount,
			&item.TotalAmount,
			&percentage,
			&totalFromRow,
		); err != nil {
			return models.AccountStatisticsCategoryHeatmapModel{}, huma.Error500InternalServerError("scan category heatmap: %w", err)
		}

		item.PercentageOfTotal = percentage
		items = append(items, item)
		totalSpending = totalFromRow
		categoryCount++
	}

	if items == nil {
		items = []models.AccountStatisticsCategoryHeatmapEntry{}
	}

	return models.AccountStatisticsCategoryHeatmapModel{
		Data:          items,
		TotalSpending: totalSpending,
		CategoryCount: categoryCount,
	}, nil
}

// GetMonthlyVelocity returns monthly spending trends
func (sr AccountStatisticsRepository) GetMonthlyVelocity(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsMonthlyVelocityModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH transaction_impacts AS (
			SELECT
				TO_CHAR(date, 'YYYY-MM') as period,
				CASE
					WHEN type = 'income' THEN 'income'
					WHEN type = 'expense' THEN 'expense'
					WHEN type = 'transfer' AND account_id = $1 THEN 'transfer_out'
					WHEN type = 'transfer' AND destination_account_id = $1 THEN 'transfer_in'
				END as impact_type,
				amount,
				CASE
					WHEN type = 'income' THEN amount
					WHEN type = 'expense' THEN -amount
					WHEN type = 'transfer' AND account_id = $1 THEN -amount
					WHEN type = 'transfer' AND destination_account_id = $1 THEN amount
					ELSE 0
				END as net_impact,
				DATE_PART('days', (date_trunc('month', date) + INTERVAL '1 month' - INTERVAL '1 day')::date::timestamp) as days_in_month
			FROM transactions
			WHERE (account_id = $1 OR destination_account_id = $1)
				AND deleted_at IS NULL
				AND date >= $2::timestamptz
				AND date <= $3::timestamptz
		),
		monthly_data AS (
			SELECT
				period,
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE impact_type = 'income') as income_count,
				COUNT(*) FILTER (WHERE impact_type = 'expense') as expense_count,
				COUNT(*) FILTER (WHERE impact_type IN ('transfer_out', 'transfer_in')) as transfer_count,
				COALESCE(SUM(amount) FILTER (WHERE impact_type = 'income'), 0) as income_amount,
				COALESCE(SUM(amount) FILTER (WHERE impact_type = 'expense'), 0) as expense_amount,
				COALESCE(SUM(amount) FILTER (WHERE impact_type = 'transfer_out'), 0) - COALESCE(SUM(amount) FILTER (WHERE impact_type = 'transfer_in'), 0) as transfer_amount,
				COALESCE(SUM(net_impact), 0) as net,
				MAX(days_in_month) as days_in_month
			FROM transaction_impacts
			GROUP BY period
		)
		SELECT
			period,
			total_count,
			income_count,
			expense_count,
			transfer_count,
			income_amount,
			expense_amount,
			transfer_amount,
			net,
			CAST(ROUND(expense_amount::numeric / CAST(days_in_month AS numeric), 2) AS bigint) as daily_average
		FROM monthly_data
		ORDER BY period DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, accountID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsMonthlyVelocityModel{}, huma.Error500InternalServerError("query monthly velocity: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var items []models.AccountStatisticsMonthlyVelocityEntry
	var totalSpending int64

	for rows.Next() {
		var item models.AccountStatisticsMonthlyVelocityEntry
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
			&item.DailyAverage,
		); err != nil {
			return models.AccountStatisticsMonthlyVelocityModel{}, huma.Error500InternalServerError("scan monthly velocity: %w", err)
		}
		items = append(items, item)
		totalSpending += item.ExpenseAmount
	}

	if items == nil {
		items = []models.AccountStatisticsMonthlyVelocityEntry{}
	}

	// Calculate average monthly spending and trend
	var avgMonthlySpend int64
	var trendDirection string = "stable"

	if len(items) > 0 {
		avgMonthlySpend = totalSpending / int64(len(items))

		// Determine trend direction by comparing recent months
		if len(items) >= 2 {
			recent := items[0].ExpenseAmount
			older := items[len(items)-1].ExpenseAmount
			if recent > older {
				trendDirection = "increasing"
			} else if recent < older {
				trendDirection = "decreasing"
			}
		}
	}

	return models.AccountStatisticsMonthlyVelocityModel{
		Data:                items,
		AverageMonthlySpend: avgMonthlySpend,
		TrendDirection:      trendDirection,
	}, nil
}

// GetTimeFrequencyHeatmap returns transaction frequency distribution
func (sr AccountStatisticsRepository) GetTimeFrequencyHeatmap(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsTimeFrequencyHeatmapModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// First, get total transaction count
	var totalTx int
	err := sr.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM transactions
		WHERE (account_id = $1 OR destination_account_id = $1)
			AND deleted_at IS NULL
			AND date >= $2::timestamptz
			AND date <= $3::timestamptz
	`, accountID, p.StartDate, p.EndDate).Scan(&totalTx)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsTimeFrequencyHeatmapModel{}, huma.Error500InternalServerError("count transactions: %w", err)
	}

	// This query analyzes gaps between transactions to determine frequency patterns
	sql := `
		WITH transaction_dates AS (
			SELECT
				date,
				LAG(date) OVER (ORDER BY date) as prev_date,
				EXTRACT(EPOCH FROM (date - LAG(date) OVER (ORDER BY date))) / 86400 as days_since_prev
			FROM transactions
			WHERE (account_id = $1 OR destination_account_id = $1)
				AND deleted_at IS NULL
				AND date >= $2::timestamptz
				AND date <= $3::timestamptz
			ORDER BY date
		),
		frequency_classified AS (
			SELECT
				CASE
					WHEN days_since_prev IS NULL THEN 'start'
					WHEN days_since_prev <= 1 THEN 'daily'
					WHEN days_since_prev <= 7 THEN 'weekly'
					WHEN days_since_prev <= 30 THEN 'monthly'
					ELSE 'irregular'
				END as frequency
			FROM transaction_dates
			WHERE days_since_prev IS NOT NULL
		),
		frequency_counts AS (
			SELECT
				frequency,
				COUNT(*) as count
			FROM frequency_classified
			GROUP BY frequency
		)
		SELECT
			frequency,
			count
		FROM frequency_counts
		ORDER BY count DESC
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, accountID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsTimeFrequencyHeatmapModel{}, huma.Error500InternalServerError("query time frequency: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var items []models.AccountStatisticsTimeFrequencyEntry
	var maxFrequency string
	var maxCount int

	for rows.Next() {
		var item models.AccountStatisticsTimeFrequencyEntry
		if err := rows.Scan(&item.Frequency, &item.Count); err != nil {
			return models.AccountStatisticsTimeFrequencyHeatmapModel{}, huma.Error500InternalServerError("scan time frequency: %w", err)
		}
		items = append(items, item)

		if item.Count > maxCount {
			maxCount = item.Count
			maxFrequency = item.Frequency
		}
	}

	if items == nil {
		items = []models.AccountStatisticsTimeFrequencyEntry{}
	}

	return models.AccountStatisticsTimeFrequencyHeatmapModel{
		Data:              items,
		MostCommonPattern: maxFrequency,
		TotalTransactions: totalTx,
	}, nil
}

// GetCashFlowPulse returns daily balance trend over the last 30 days
func (sr AccountStatisticsRepository) GetCashFlowPulse(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsCashFlowPulseModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// Get current balance and calculate balance at period start
	var currentBalance int64
	balanceStart := time.Now()
	err := sr.db.QueryRow(ctx, "SELECT amount FROM accounts WHERE id = $1", accountID).Scan(&currentBalance)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsCashFlowPulseModel{}, huma.Error500InternalServerError("get account balance: %w", err)
	}
	observability.RecordQueryDuration("SELECT", "accounts", time.Since(balanceStart).Seconds())

	// Calculate net flow from period start to now to determine starting balance
	// Include both outgoing and incoming transfers
	netFlowSQL := `
		SELECT COALESCE(
			SUM(
				CASE
					WHEN type = 'income' THEN amount
					WHEN type = 'expense' THEN -amount
					WHEN type = 'transfer' AND account_id = $1 THEN -amount
					WHEN type = 'transfer' AND destination_account_id = $1 THEN amount
					ELSE 0
				END
			), 0) as net_flow
		FROM transactions
		WHERE (account_id = $1 OR destination_account_id = $1)
			AND date >= $2::timestamptz
			AND deleted_at IS NULL
	`

	var netFlowFromStart int64
	netFlowStart := time.Now()
	err = sr.db.QueryRow(ctx, netFlowSQL, accountID, p.StartDate).Scan(&netFlowFromStart)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsCashFlowPulseModel{}, huma.Error500InternalServerError("query net flow: %w", err)
	}
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(netFlowStart).Seconds())

	// Calculate starting balance by subtracting transactions that happened after period start
	startingBalance := currentBalance - netFlowFromStart

	// Query to get daily transactions and calculate running balance
	// Include both outgoing and incoming transfers
	sql := `
		WITH transaction_impacts AS (
			SELECT
				DATE(t.date) as tx_date,
				CASE
					WHEN t.type = 'income' THEN t.amount
					WHEN t.type = 'expense' THEN -t.amount
					WHEN t.type = 'transfer' AND t.account_id = $1 THEN -t.amount
					WHEN t.type = 'transfer' AND t.destination_account_id = $1 THEN t.amount
					ELSE 0
				END as amount_impact
			FROM transactions t
			WHERE (t.account_id = $1 OR t.destination_account_id = $1)
				AND t.date >= $2::timestamptz
				AND t.date <= $3::timestamptz
				AND t.deleted_at IS NULL
		),
		daily_transactions AS (
			SELECT
				tx_date,
				SUM(amount_impact) as daily_net
			FROM transaction_impacts
			GROUP BY tx_date
		),
		date_series AS (
			SELECT DATE(d) as date_val
			FROM generate_series(DATE($2::timestamptz), DATE($3::timestamptz), '1 day'::interval) d
		),
		daily_flow AS (
			SELECT
				ds.date_val,
				COALESCE(dt.daily_net, 0) as net_flow
			FROM date_series ds
			LEFT JOIN daily_transactions dt ON ds.date_val = dt.tx_date
		)
		SELECT date_val, net_flow FROM daily_flow ORDER BY date_val
	`

	queryStart := time.Now()
	rows, err := sr.db.Query(ctx, sql, accountID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsCashFlowPulseModel{}, huma.Error500InternalServerError("query cash flow: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var items []models.AccountStatisticsCashFlowDataPoint
	var minBalance, maxBalance, runningBalance int64

	runningBalance = startingBalance
	minBalance = startingBalance
	maxBalance = startingBalance

	for rows.Next() {
		var date time.Time
		var netFlow int64

		if err := rows.Scan(&date, &netFlow); err != nil {
			return models.AccountStatisticsCashFlowPulseModel{}, huma.Error500InternalServerError("scan cash flow: %w", err)
		}

		runningBalance += netFlow

		items = append(items, models.AccountStatisticsCashFlowDataPoint{
			Date:    date.Format("2006-01-02"),
			Balance: runningBalance,
		})

		if runningBalance < minBalance {
			minBalance = runningBalance
		}
		if runningBalance > maxBalance {
			maxBalance = runningBalance
		}
	}

	if items == nil {
		items = []models.AccountStatisticsCashFlowDataPoint{}
	}

	trendDirection := "stable"
	if len(items) > 1 && items[len(items)-1].Balance > items[0].Balance {
		trendDirection = "increasing"
	} else if len(items) > 1 && items[len(items)-1].Balance < items[0].Balance {
		trendDirection = "decreasing"
	}

	return models.AccountStatisticsCashFlowPulseModel{
		Data:            items,
		StartingBalance: startingBalance,
		EndingBalance:   runningBalance,
		MinBalance:      minBalance,
		MaxBalance:      maxBalance,
		TrendDirection:  trendDirection,
	}, nil
}

// GetBurnRate returns spending rate and budget projection
func (sr AccountStatisticsRepository) GetBurnRate(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBurnRateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		SELECT
			COUNT(DISTINCT DATE(t.date)) as spending_days,
			COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_spending,
			COUNT(*) as total_transactions
		FROM transactions t
		WHERE t.account_id = $1
			AND t.date >= $2::timestamptz
			AND t.date <= $3::timestamptz
			AND t.type = 'expense'
			AND t.deleted_at IS NULL
	`

	var spendingDays int
	var totalSpending int64
	var totalTransactions int

	queryStart := time.Now()
	err := sr.db.QueryRow(ctx, sql, accountID, p.StartDate, p.EndDate).Scan(&spendingDays, &totalSpending, &totalTransactions)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsBurnRateModel{}, huma.Error500InternalServerError("query burn rate: %w", err)
	}
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	// Calculate daily and period averages
	daysDiff := int(p.EndDate.Sub(p.StartDate).Hours() / 24)
	if daysDiff == 0 {
		daysDiff = 1
	}

	dailyAverage := totalSpending / int64(daysDiff)
	weeklyAverage := dailyAverage * 7
	monthlyAverage := dailyAverage * 30

	// Check for active budget
	budgetSQL := `
		SELECT
			COALESCE(amount_limit, 0) as amount_limit,
			period_start,
			period_end
		FROM budgets
		WHERE account_id = $1
			AND status = 'active'
			AND period_start <= CURRENT_DATE
			AND period_end >= CURRENT_DATE
			AND deleted_at IS NULL
		LIMIT 1
	`

	var budgetLimit int64
	var periodStart, periodEnd time.Time
	budgetLimitStatus := "no-budget"
	daysRemaining := 0

	budgetStart := time.Now()
	err = sr.db.QueryRow(ctx, budgetSQL, accountID).Scan(&budgetLimit, &periodStart, &periodEnd)
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(budgetStart).Seconds())

	if err == nil && budgetLimit > 0 {
		daysRemaining = int(time.Until(periodEnd).Hours() / 24)
		if daysRemaining < 0 {
			daysRemaining = 0
		}

		// Get current spending in active budget period
		currentBudgetSQL := `
			SELECT COALESCE(SUM(amount), 0)
			FROM transactions
			WHERE account_id = $1
				AND type = 'expense'
				AND date >= $2::timestamptz
				AND date <= $3::timestamptz
				AND deleted_at IS NULL
		`

		var currentSpending int64
		budgetSpendStart := time.Now()
		sr.db.QueryRow(ctx, currentBudgetSQL, accountID, periodStart, periodEnd).Scan(&currentSpending)
		observability.RecordQueryDuration("SELECT", "transactions", time.Since(budgetSpendStart).Seconds())

		remaining := budgetLimit - currentSpending
		if remaining <= 0 {
			budgetLimitStatus = "exceeded"
		} else if float64(currentSpending) > float64(budgetLimit)*0.8 {
			budgetLimitStatus = "at-risk"
		} else {
			budgetLimitStatus = "within"
		}
	}

	return models.AccountStatisticsBurnRateModel{
		DailyAverageSpend:   dailyAverage,
		WeeklyAverageSpend:  weeklyAverage,
		MonthlyAverageSpend: monthlyAverage,
		TotalSpending:       totalSpending,
		DaysRemaining:       daysRemaining,
		SpendingDays:        spendingDays,
		BudgetLimitStatus:   budgetLimitStatus,
	}, nil
}

// GetBudgetHealth returns budget health and achievement metrics
func (sr AccountStatisticsRepository) GetBudgetHealth(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBudgetHealthModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// Get active budgets
	activeBudgetSQL := `
		SELECT 
			b.id,
			b.name,
			b.period_start,
			b.period_end,
			b.amount_limit,
			COALESCE(SUM(t.amount), 0) as amount_spent
		FROM budgets b
		LEFT JOIN transactions t ON t.account_id = b.account_id
			AND (b.category_id IS NULL OR t.category_id = b.category_id)
			AND t.type = 'expense'
			AND t.date >= b.period_start
			AND t.date <= b.period_end
			AND t.deleted_at IS NULL
		WHERE b.account_id = $1
			AND b.status = 'active'
			AND b.period_start <= $3::timestamptz
			AND b.period_end >= $2::timestamptz
			AND b.deleted_at IS NULL
		GROUP BY b.id, b.name, b.period_start, b.period_end, b.amount_limit
		ORDER BY b.period_end ASC
	`

	activeBudgets := []models.AccountStatisticsBudgetHealthEntry{}
	activeStart := time.Now()
	rows, err := sr.db.Query(ctx, activeBudgetSQL, accountID, p.StartDate, p.EndDate)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsBudgetHealthModel{}, huma.Error500InternalServerError("query active budgets: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(activeStart).Seconds())

	for rows.Next() {
		var id int64
		var name string
		var periodStart, periodEnd time.Time
		var amountLimit, amountSpent int64

		if err := rows.Scan(&id, &name, &periodStart, &periodEnd, &amountLimit, &amountSpent); err != nil {
			return models.AccountStatisticsBudgetHealthModel{}, huma.Error500InternalServerError("scan active budgets: %w", err)
		}

		percentageUsed := 0.0
		if amountLimit > 0 {
			percentageUsed = (float64(amountSpent) / float64(amountLimit)) * 100
		}

		status := "on-track"
		if percentageUsed >= 100 {
			status = "exceeded"
		} else if percentageUsed >= 80 {
			status = "warning"
		}

		daysRemaining := int(time.Until(periodEnd).Hours() / 24)
		if daysRemaining < 0 {
			daysRemaining = 0
		}

		activeBudgets = append(activeBudgets, models.AccountStatisticsBudgetHealthEntry{
			BudgetID:       id,
			BudgetName:     name,
			PeriodStart:    periodStart.Format("2006-01-02"),
			PeriodEnd:      periodEnd.Format("2006-01-02"),
			AmountLimit:    amountLimit,
			AmountSpent:    amountSpent,
			PercentageUsed: percentageUsed,
			Status:         status,
			DaysRemaining:  daysRemaining,
		})
	}

	// Get past budgets
	pastBudgetSQL := `
		SELECT 
			b.id,
			b.name,
			b.period_start,
			b.period_end,
			b.amount_limit,
			COALESCE(SUM(t.amount), 0) as amount_spent
		FROM budgets b
		LEFT JOIN transactions t ON t.account_id = b.account_id
			AND (b.category_id IS NULL OR t.category_id = b.category_id)
			AND t.type = 'expense'
			AND t.date >= b.period_start
			AND t.date <= b.period_end
			AND t.deleted_at IS NULL
		WHERE b.account_id = $1
			AND b.period_end < CURRENT_DATE
			AND b.deleted_at IS NULL
		GROUP BY b.id, b.name, b.period_start, b.period_end, b.amount_limit
		ORDER BY b.period_end DESC
		LIMIT 12
	`

	pastBudgets := []models.AccountStatisticsBudgetHealthEntry{}
	pastStart := time.Now()
	rows, err = sr.db.Query(ctx, pastBudgetSQL, accountID)
	if err != nil {
		observability.RecordError("database")
		return models.AccountStatisticsBudgetHealthModel{}, huma.Error500InternalServerError("query past budgets: %w", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(pastStart).Seconds())

	achievedCount := 0

	for rows.Next() {
		var id int64
		var name string
		var periodStart, periodEnd time.Time
		var amountLimit, amountSpent int64

		if err := rows.Scan(&id, &name, &periodStart, &periodEnd, &amountLimit, &amountSpent); err != nil {
			return models.AccountStatisticsBudgetHealthModel{}, huma.Error500InternalServerError("scan past budgets: %w", err)
		}

		percentageUsed := 0.0
		if amountLimit > 0 {
			percentageUsed = (float64(amountSpent) / float64(amountLimit)) * 100
		}

		status := "past"
		if amountSpent <= amountLimit {
			status = "achieved"
			achievedCount++
		}

		pastBudgets = append(pastBudgets, models.AccountStatisticsBudgetHealthEntry{
			BudgetID:       id,
			BudgetName:     name,
			PeriodStart:    periodStart.Format("2006-01-02"),
			PeriodEnd:      periodEnd.Format("2006-01-02"),
			AmountLimit:    amountLimit,
			AmountSpent:    amountSpent,
			PercentageUsed: percentageUsed,
			Status:         status,
			DaysRemaining:  0,
		})
	}

	overallStatus := "healthy"
	achievementRate := 0.0
	totalBudgets := len(activeBudgets) + len(pastBudgets)

	if len(pastBudgets) > 0 {
		achievementRate = (float64(achievedCount) / float64(len(pastBudgets))) * 100
	}

	// Determine overall status based on active budgets
	for _, b := range activeBudgets {
		if b.Status == "exceeded" {
			overallStatus = "concerning"
			break
		} else if b.Status == "warning" && overallStatus != "concerning" {
			overallStatus = "at-risk"
		}
	}

	return models.AccountStatisticsBudgetHealthModel{
		ActiveBudgets:   activeBudgets,
		PastBudgets:     pastBudgets,
		OverallStatus:   overallStatus,
		TotalBudgets:    totalBudgets,
		AchievementRate: achievementRate,
	}, nil
}
