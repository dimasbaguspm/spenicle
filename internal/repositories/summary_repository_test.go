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
		params := schemas.SummaryTransactionParamModel{
			SummaryParamModel: schemas.SummaryParamModel{},
			Frequency:         "monthly",
		}

		rows := pgxmock.NewRows([]string{
			"period", "total_count", "income_count", "expense_count", "transfer_count",
			"income_amount", "expense_amount", "transfer_amount", "net",
		}).
			AddRow("2024-01", 150, 50, 95, 5, 5000000, 3500000, 500000, 1500000).
			AddRow("2023-12", 120, 40, 75, 5, 4000000, 2800000, 400000, 1200000)

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY-MM'\\).*FROM transactions").
			WillReturnRows(rows)

		result, err := repo.GetTransactionSummary(ctx, params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "monthly" {
			t.Errorf("expected frequency 'monthly', got %s", result.Frequency)
		}

		if len(result.Data) != 2 {
			t.Errorf("expected 2 items, got %d", len(result.Data))
		}

		first := result.Data[0]
		if first.Period != "2024-01" {
			t.Errorf("expected period '2024-01', got %s", first.Period)
		}
		if first.TotalCount != 150 {
			t.Errorf("expected total count 150, got %d", first.TotalCount)
		}
		if first.Net != 1500000 {
			t.Errorf("expected net 1500000, got %d", first.Net)
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("successfully gets daily transaction summary with date filter", func(t *testing.T) {
		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
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
			AddRow("2024-01-15", 10, 3, 6, 1, 300000, 200000, 50000, 100000)

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

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unfulfilled expectations: %v", err)
		}
	})

	t.Run("returns empty array when no data", func(t *testing.T) {
		params := schemas.SummaryTransactionParamModel{
			Frequency: "yearly",
		}

		rows := pgxmock.NewRows([]string{
			"period", "total_count", "income_count", "expense_count", "transfer_count",
			"income_amount", "expense_amount", "transfer_amount", "net",
		})

		mock.ExpectQuery("SELECT.*TO_CHAR\\(date, 'YYYY'\\).*FROM transactions").
			WillReturnRows(rows)

		result, err := repo.GetTransactionSummary(ctx, params)
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
