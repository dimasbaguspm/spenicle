package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/pashagolub/pgxmock/v4"
)

func TestSummaryRepositoryGetTransactionSummary(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewSummaryRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets monthly transaction summary", func(t *testing.T) {
		startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		endDate := time.Date(2024, 2, 28, 23, 59, 59, 0, time.UTC)

		params := schemas.SummaryTransactionParamModel{
			SummaryParamModel: schemas.SummaryParamModel{
				StartDate: startDate,
				EndDate:   endDate,
			},
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"period", "total_count", "income_count", "expense_count", "transfer_count",
			"income_amount", "expense_amount", "transfer_amount", "net",
		}).
			AddRow("2024-01", 150, 50, 95, 5, 5000000, 3500000, 500000, 1500000)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM'\\).*FROM transactions").
			WithArgs(startDate, endDate).
			WillReturnRows(rows)

		result, err := repo.GetTransactionSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "monthly" {
			t.Errorf("expected frequency 'monthly', got %s", result.Frequency)
		}

		// Should have 2 months: 2024-01 and 2024-02 (filled with zero)
		if len(result.Data) != 2 {
			t.Errorf("expected 2 items, got %d", len(result.Data))
		}

		// First item should be 2024-02 (DESC order) with zero values
		first := result.Data[0]
		if first.Period != "2024-02" {
			t.Errorf("expected period '2024-02', got %s", first.Period)
		}
		if first.TotalCount != 0 {
			t.Errorf("expected total count 0, got %d", first.TotalCount)
		}

		// Second item should be 2024-01 with actual data
		second := result.Data[1]
		if second.Period != "2024-01" {
			t.Errorf("expected period '2024-01', got %s", second.Period)
		}
		if second.TotalCount != 150 {
			t.Errorf("expected total count 150, got %d", second.TotalCount)
		}
		if second.Net != 1500000 {
			t.Errorf("expected net 1500000, got %d", second.Net)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets daily transaction summary with date filter", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 3, 23, 59, 59, 0, time.UTC)
		params := schemas.SummaryTransactionParamModel{
			SummaryParamModel: schemas.SummaryParamModel{
				StartDate: start,
				EndDate:   end,
			},
			Frequency: "daily",
		}

		rows := pgxmock.NewRows([]string{
			"period", "total_count", "income_count", "expense_count", "transfer_count",
			"income_amount", "expense_amount", "transfer_amount", "net",
		}).
			AddRow("2024-01-02", 10, 3, 6, 1, 300000, 200000, 50000, 100000)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM-DD'\\).*FROM transactions.*WHERE.*date >= \\$1.*AND date <= \\$2").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetTransactionSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "daily" {
			t.Errorf("expected frequency 'daily', got %s", result.Frequency)
		}

		// Should have 3 days: 2024-01-01, 2024-01-02, 2024-01-03
		if len(result.Data) != 3 {
			t.Errorf("expected 3 items, got %d", len(result.Data))
		}

		// Check that 2024-01-02 has data
		if result.Data[1].Period != "2024-01-02" {
			t.Errorf("expected period '2024-01-02', got %s", result.Data[1].Period)
		}
		if result.Data[1].TotalCount != 10 {
			t.Errorf("expected total count 10, got %d", result.Data[1].TotalCount)
		}

		// Check that 2024-01-01 is filled with zeros
		if result.Data[2].TotalCount != 0 {
			t.Errorf("expected zero-filled period, got %d", result.Data[2].TotalCount)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		endDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

		params := schemas.SummaryTransactionParamModel{
			SummaryParamModel: schemas.SummaryParamModel{
				StartDate: startDate,
				EndDate:   endDate,
			},
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"period", "total_count", "income_count", "expense_count", "transfer_count",
			"income_amount", "expense_amount", "transfer_amount", "net",
		})

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM'\\).*FROM transactions").
			WithArgs(startDate, endDate).
			WillReturnRows(rows)

		result, err := repo.GetTransactionSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Should return 1 month (2024-01) with zero values
		if len(result.Data) != 1 {
			t.Errorf("expected 1 item with zeros, got %d", len(result.Data))
		}

		if result.Data[0].TotalCount != 0 {
			t.Errorf("expected TotalCount 0, got %d", result.Data[0].TotalCount)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})
}

func TestSummaryRepositoryGetAccountSummary(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewSummaryRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets account summary", func(t *testing.T) {
		params := schemas.SummaryParamModel{}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "account_type", "total_count",
			"income_amount", "expense_amount", "net",
		}).
			AddRow(1, "Cash", "expense", 100, 3000000, 2500000, 500000).
			AddRow(2, "Bank", "income", 75, 5000000, 1000000, 4000000)

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a").
			WillReturnRows(rows)

		result, err := repo.GetAccountSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 items, got %d", len(result.Data))
		}

		first := result.Data[0]
		if first.AccountID != 1 {
			t.Errorf("expected account_id 1, got %d", first.AccountID)
		}
		if first.AccountName != "Cash" {
			t.Errorf("expected account_name 'Cash', got %s", first.AccountName)
		}
		if first.Net != 500000 {
			t.Errorf("expected net 500000, got %d", first.Net)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets account summary with date filter", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		params := schemas.SummaryParamModel{
			StartDate: start,
		}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "account_type", "total_count",
			"income_amount", "expense_amount", "net",
		}).
			AddRow(1, "Cash", "expense", 50, 1500000, 1200000, 300000)

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*WHERE.*date >= \\$1").
			WithArgs(start).
			WillReturnRows(rows)

		result, err := repo.GetAccountSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		params := schemas.SummaryParamModel{}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "account_type", "total_count",
			"income_amount", "expense_amount", "net",
		})

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a").
			WillReturnRows(rows)

		result, err := repo.GetAccountSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 0 {
			t.Errorf("expected empty array, got %d items", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})
}

func TestSummaryRepositoryGetCategorySummary(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewSummaryRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets category summary", func(t *testing.T) {
		params := schemas.SummaryParamModel{}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "total_count",
			"income_amount", "expense_amount", "net",
		}).
			AddRow(1, "Food", "expense", 75, 0, 1500000, -1500000).
			AddRow(2, "Salary", "income", 12, 6000000, 0, 6000000)

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN categories c").
			WillReturnRows(rows)

		result, err := repo.GetCategorySummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 items, got %d", len(result.Data))
		}

		first := result.Data[0]
		if first.CategoryID != 1 {
			t.Errorf("expected category_id 1, got %d", first.CategoryID)
		}
		if first.CategoryName != "Food" {
			t.Errorf("expected category_name 'Food', got %s", first.CategoryName)
		}
		if first.Net != -1500000 {
			t.Errorf("expected net -1500000, got %d", first.Net)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets category summary with date range", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.SummaryParamModel{
			StartDate: start,
			EndDate:   end,
		}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "total_count",
			"income_amount", "expense_amount", "net",
		}).
			AddRow(1, "Food", "expense", 50, 0, 1000000, -1000000)

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN categories c.*WHERE.*date >= \\$1.*AND.*date <= \\$2").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetCategorySummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		params := schemas.SummaryParamModel{}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "total_count",
			"income_amount", "expense_amount", "net",
		})

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN categories c").
			WillReturnRows(rows)

		result, err := repo.GetCategorySummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 0 {
			t.Errorf("expected empty array, got %d items", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})
}

func TestSummaryRepositoryGetAccountTrend(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewSummaryRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets monthly account trends", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 3, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		}).
			AddRow(1, "Cash", "2024-01", 1000000, 500000, 300000, 200000, 200000, 10).
			AddRow(1, "Cash", "2024-02", 1200000, 600000, 350000, 250000, 250000, 12).
			AddRow(1, "Cash", "2024-03", 900000, 450000, 300000, 150000, 150000, 8).
			AddRow(2, "Bank", "2024-01", 2000000, 1500000, 400000, 100000, 1100000, 15)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM'\\).*FROM transactions t.*JOIN accounts a").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetAccountTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "monthly" {
			t.Errorf("expected frequency 'monthly', got %s", result.Frequency)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 accounts, got %d", len(result.Data))
		}

		// Check first account (Cash) with 3 periods
		account1 := result.Data[0]
		if account1.AccountID != 1 {
			t.Errorf("expected account ID 1, got %d", account1.AccountID)
		}
		if account1.AccountName != "Cash" {
			t.Errorf("expected account name 'Cash', got %s", account1.AccountName)
		}
		if len(account1.Periods) != 3 {
			t.Errorf("expected 3 periods for account 1, got %d", len(account1.Periods))
		}

		// First period should have no change
		if account1.Periods[0].ChangePercent != 0 {
			t.Errorf("expected first period change to be 0, got %.2f", account1.Periods[0].ChangePercent)
		}
		if account1.Periods[0].Trend != "stable" {
			t.Errorf("expected first period trend 'stable', got %s", account1.Periods[0].Trend)
		}

		// Second period should show increase (1000000 -> 1200000 = 20% increase)
		if account1.Periods[1].ChangePercent != 20.0 {
			t.Errorf("expected second period change 20%%, got %.2f%%", account1.Periods[1].ChangePercent)
		}
		if account1.Periods[1].Trend != "increasing" {
			t.Errorf("expected second period trend 'increasing', got %s", account1.Periods[1].Trend)
		}

		// Third period should show decrease (1200000 -> 900000 = -25% decrease)
		if account1.Periods[2].ChangePercent != -25.0 {
			t.Errorf("expected third period change -25%%, got %.2f%%", account1.Periods[2].ChangePercent)
		}
		if account1.Periods[2].Trend != "decreasing" {
			t.Errorf("expected third period trend 'decreasing', got %s", account1.Periods[2].Trend)
		}

		// Check trend status (volatile since both increasing and decreasing)
		if account1.TrendStatus != "volatile" {
			t.Errorf("expected trend status 'volatile', got %s", account1.TrendStatus)
		}

		// Check second account (Bank) with 3 periods (2 filled with zeros, 1 with data)
		account2 := result.Data[1]
		if account2.AccountID != 2 {
			t.Errorf("expected account ID 2, got %d", account2.AccountID)
		}
		if len(account2.Periods) != 3 {
			t.Errorf("expected 3 periods for account 2, got %d", len(account2.Periods))
		}

		// Check that account2 has data only in first period
		if account2.Periods[0].TotalAmount != 2000000 {
			t.Errorf("expected first period amount 2000000, got %d", account2.Periods[0].TotalAmount)
		}
		// Second and third periods should be zero
		if account2.Periods[1].TotalAmount != 0 {
			t.Errorf("expected second period to be zero-filled, got %d", account2.Periods[1].TotalAmount)
		}
		if account2.Periods[2].TotalAmount != 0 {
			t.Errorf("expected third period to be zero-filled, got %d", account2.Periods[2].TotalAmount)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets weekly account trends", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "weekly",
		}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		}).
			AddRow(1, "Cash", "2024-W01", 500000, 300000, 200000, 0, 100000, 5).
			AddRow(1, "Cash", "2024-W02", 550000, 350000, 200000, 0, 150000, 6)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'IYYY-\"W\"IW'\\).*FROM transactions t.*JOIN accounts a").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetAccountTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "weekly" {
			t.Errorf("expected frequency 'weekly', got %s", result.Frequency)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 account, got %d", len(result.Data))
		}

		account := result.Data[0]
		// January 2024 has 5 weeks, so we should get 5 periods (2 with data, 3 zero-filled)
		if len(account.Periods) != 5 {
			t.Errorf("expected 5 periods (for 5 weeks in Jan), got %d", len(account.Periods))
		}

		// Check that first two weeks have data
		if account.Periods[0].Period != "2024-W01" {
			t.Errorf("expected period '2024-W01', got %s", account.Periods[0].Period)
		}
		if account.Periods[0].TotalAmount != 500000 {
			t.Errorf("expected amount 500000, got %d", account.Periods[0].TotalAmount)
		}
		if account.Periods[1].TotalAmount != 550000 {
			t.Errorf("expected amount 550000, got %d", account.Periods[1].TotalAmount)
		}

		// Check that remaining weeks are zero-filled
		for i := 2; i < 5; i++ {
			if account.Periods[i].TotalAmount != 0 {
				t.Errorf("expected zero-filled period at index %d, got %d", i, account.Periods[i].TotalAmount)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"account_id", "account_name", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		})

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetAccountTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 0 {
			t.Errorf("expected empty array, got %d items", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})
}

func TestSummaryRepositoryGetCategoryTrend(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	defer mock.Close()

	repo := NewSummaryRepository(mock)
	ctx := context.Background()

	t.Run("successfully gets monthly category trends", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 3, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		}).
			AddRow(1, "Food", "expense", "2024-01", 1000000, 0, 1000000, 0, -1000000, 20).
			AddRow(1, "Food", "expense", "2024-02", 1100000, 0, 1100000, 0, -1100000, 22).
			AddRow(1, "Food", "expense", "2024-03", 950000, 0, 950000, 0, -950000, 18).
			AddRow(2, "Salary", "income", "2024-01", 5000000, 5000000, 0, 0, 5000000, 1)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM'\\).*FROM transactions t.*JOIN categories c").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetCategoryTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "monthly" {
			t.Errorf("expected frequency 'monthly', got %s", result.Frequency)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 categories, got %d", len(result.Data))
		}

		// Check expense category (Food)
		category1 := result.Data[0]
		if category1.CategoryID != 1 {
			t.Errorf("expected category ID 1, got %d", category1.CategoryID)
		}
		if category1.CategoryName != "Food" {
			t.Errorf("expected category name 'Food', got %s", category1.CategoryName)
		}
		if category1.CategoryType != "expense" {
			t.Errorf("expected category type 'expense', got %s", category1.CategoryType)
		}
		if len(category1.Periods) != 3 {
			t.Errorf("expected 3 periods for category 1, got %d", len(category1.Periods))
		}

		// Check increasing trend detection (1000000 -> 1100000 = 10% increase)
		if category1.Periods[1].ChangePercent != 10.0 {
			t.Errorf("expected second period change 10%%, got %.2f%%", category1.Periods[1].ChangePercent)
		}
		if category1.Periods[1].Trend != "increasing" {
			t.Errorf("expected second period trend 'increasing', got %s", category1.Periods[1].Trend)
		}

		// Check income category (Salary) - should have 3 periods (1 with data, 2 zero-filled)
		category2 := result.Data[1]
		if category2.CategoryID != 2 {
			t.Errorf("expected category ID 2, got %d", category2.CategoryID)
		}
		if category2.CategoryType != "income" {
			t.Errorf("expected category type 'income', got %s", category2.CategoryType)
		}
		if len(category2.Periods) != 3 {
			t.Errorf("expected 3 periods for category 2, got %d", len(category2.Periods))
		}

		// First period has data
		if category2.Periods[0].TotalAmount != 5000000 {
			t.Errorf("expected first period amount 5000000, got %d", category2.Periods[0].TotalAmount)
		}

		// Second and third periods are zero-filled
		if category2.Periods[1].TotalAmount != 0 || category2.Periods[2].TotalAmount != 0 {
			t.Errorf("expected second and third periods to be zero-filled")
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets weekly category trends", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "weekly",
		}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		}).
			AddRow(1, "Food", "expense", "2024-W01", 250000, 0, 250000, 0, -250000, 5).
			AddRow(1, "Food", "expense", "2024-W02", 300000, 0, 300000, 0, -300000, 6)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'IYYY-\"W\"IW'\\).*FROM transactions t.*JOIN categories c").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetCategoryTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "weekly" {
			t.Errorf("expected frequency 'weekly', got %s", result.Frequency)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 category, got %d", len(result.Data))
		}

		category := result.Data[0]
		// January 2024 has 5 weeks, should get 5 periods (2 with data, 3 zero-filled)
		if len(category.Periods) != 5 {
			t.Errorf("expected 5 periods (for 5 weeks in Jan), got %d", len(category.Periods))
		}

		// Check that first two weeks have data
		if category.Periods[0].TotalAmount != 250000 {
			t.Errorf("expected first period amount 250000, got %d", category.Periods[0].TotalAmount)
		}
		if category.Periods[1].TotalAmount != 300000 {
			t.Errorf("expected second period amount 300000, got %d", category.Periods[1].TotalAmount)
		}

		// Check change calculation (250000 -> 300000 = 20% increase)
		if category.Periods[1].ChangePercent != 20.0 {
			t.Errorf("expected change 20%%, got %.2f%%", category.Periods[1].ChangePercent)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		params := schemas.TrendParamSchema{
			StartDate: start,
			EndDate:   end,
			Frequency: "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"category_id", "category_name", "category_type", "period", "total_amount",
			"income_amount", "expense_amount", "transfer_amount", "net", "count",
		})

		mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN categories c").
			WithArgs(start, end).
			WillReturnRows(rows)

		result, err := repo.GetCategoryTrend(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 0 {
			t.Errorf("expected empty array, got %d items", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})
}
