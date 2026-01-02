package services

import (
	"context"
	"errors"
	"testing"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

type mockSummaryStore struct {
	getTransactionSummaryFunc func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error)
	getAccountSummaryFunc     func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error)
	getCategorySummaryFunc    func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error)
}

func (m *mockSummaryStore) GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
	if m.getTransactionSummaryFunc != nil {
		return m.getTransactionSummaryFunc(ctx, params)
	}
	return schemas.SummaryTransactionSchema{}, nil
}

func (m *mockSummaryStore) GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
	if m.getAccountSummaryFunc != nil {
		return m.getAccountSummaryFunc(ctx, params)
	}
	return schemas.SummaryAccountSchema{}, nil
}

func (m *mockSummaryStore) GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
	if m.getCategorySummaryFunc != nil {
		return m.getCategorySummaryFunc(ctx, params)
	}
	return schemas.SummaryCategorySchema{}, nil
}

func TestSummaryServiceGetTransactionSummary(t *testing.T) {
	t.Run("successfully gets transaction summary", func(t *testing.T) {
		expectedData := schemas.SummaryTransactionSchema{
			Frequency: "monthly",
			Data: []schemas.SummaryTransactionItem{
				{Period: "2024-01", TotalCount: 100, Net: 1000000},
			},
		}

		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return expectedData, nil
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryTransactionParamModel{Frequency: "monthly"}

		result, err := service.GetTransactionSummary(context.Background(), params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != expectedData.Frequency {
			t.Errorf("expected frequency %s, got %s", expectedData.Frequency, result.Frequency)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}
	})

	t.Run("sets default frequency when not provided", func(t *testing.T) {
		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				if params.Frequency != "monthly" {
					t.Errorf("expected default frequency 'monthly', got %s", params.Frequency)
				}
				return schemas.SummaryTransactionSchema{Frequency: params.Frequency}, nil
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryTransactionParamModel{} // No frequency set

		result, err := service.GetTransactionSummary(context.Background(), params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Frequency != "monthly" {
			t.Errorf("expected default frequency 'monthly', got %s", result.Frequency)
		}
	})

	t.Run("returns error from store", func(t *testing.T) {
		expectedErr := errors.New("database error")
		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{}, expectedErr
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryTransactionParamModel{Frequency: "daily"}

		_, err := service.GetTransactionSummary(context.Background(), params)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestSummaryServiceGetAccountSummary(t *testing.T) {
	t.Run("successfully gets account summary", func(t *testing.T) {
		expectedData := schemas.SummaryAccountSchema{
			Data: []schemas.SummaryAccountModel{
				{AccountID: 1, AccountName: "Cash", TotalCount: 50, Net: 500000},
			},
		}

		store := &mockSummaryStore{
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return expectedData, nil
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryParamModel{}

		result, err := service.GetAccountSummary(context.Background(), params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}

		if result.Data[0].AccountID != 1 {
			t.Errorf("expected accountId 1, got %d", result.Data[0].AccountID)
		}
	})

	t.Run("returns error from store", func(t *testing.T) {
		expectedErr := errors.New("database error")
		store := &mockSummaryStore{
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{}, expectedErr
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryParamModel{}

		_, err := service.GetAccountSummary(context.Background(), params)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestSummaryServiceGetCategorySummary(t *testing.T) {
	t.Run("successfully gets category summary", func(t *testing.T) {
		expectedData := schemas.SummaryCategorySchema{
			Data: []schemas.SummaryCategoryModel{
				{CategoryID: 1, CategoryName: "Food", TotalCount: 75, Net: -1500000},
			},
		}

		store := &mockSummaryStore{
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return expectedData, nil
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryParamModel{}

		result, err := service.GetCategorySummary(context.Background(), params)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Data) != 1 {
			t.Errorf("expected 1 item, got %d", len(result.Data))
		}

		if result.Data[0].CategoryID != 1 {
			t.Errorf("expected categoryId 1, got %d", result.Data[0].CategoryID)
		}
	})

	t.Run("returns error from store", func(t *testing.T) {
		expectedErr := errors.New("database error")
		store := &mockSummaryStore{
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{}, expectedErr
			},
		}

		service := NewSummaryService(store)
		params := schemas.SummaryParamModel{}

		_, err := service.GetCategorySummary(context.Background(), params)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestSummaryServiceGetAllSummaries(t *testing.T) {
	t.Run("successfully gets all summaries concurrently", func(t *testing.T) {
		transactionData := schemas.SummaryTransactionSchema{
			Frequency: "monthly",
			Data:      []schemas.SummaryTransactionItem{{Period: "2024-01", TotalCount: 100}},
		}
		accountData := schemas.SummaryAccountSchema{
			Data: []schemas.SummaryAccountModel{{AccountID: 1, AccountName: "Cash"}},
		}
		categoryData := schemas.SummaryCategorySchema{
			Data: []schemas.SummaryCategoryModel{{CategoryID: 1, CategoryName: "Food"}},
		}

		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return transactionData, nil
			},
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return accountData, nil
			},
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return categoryData, nil
			},
		}

		service := NewSummaryService(store)
		transactionParams := schemas.SummaryTransactionParamModel{Frequency: "monthly"}
		accountParams := schemas.SummaryParamModel{}
		categoryParams := schemas.SummaryParamModel{}

		tResult, aResult, cResult, err := service.GetAllSummaries(context.Background(), transactionParams, accountParams, categoryParams)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if tResult.Frequency != "monthly" {
			t.Errorf("expected transaction frequency 'monthly', got %s", tResult.Frequency)
		}
		if len(aResult.Data) != 1 {
			t.Errorf("expected 1 account item, got %d", len(aResult.Data))
		}
		if len(cResult.Data) != 1 {
			t.Errorf("expected 1 category item, got %d", len(cResult.Data))
		}
	})

	t.Run("returns error from transaction summary", func(t *testing.T) {
		expectedErr := errors.New("transaction error")
		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{}, expectedErr
			},
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{}, nil
			},
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{}, nil
			},
		}

		service := NewSummaryService(store)
		transactionParams := schemas.SummaryTransactionParamModel{Frequency: "monthly"}
		accountParams := schemas.SummaryParamModel{}
		categoryParams := schemas.SummaryParamModel{}

		_, _, _, err := service.GetAllSummaries(context.Background(), transactionParams, accountParams, categoryParams)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})

	t.Run("returns error from account summary", func(t *testing.T) {
		expectedErr := errors.New("account error")
		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{}, nil
			},
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{}, expectedErr
			},
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{}, nil
			},
		}

		service := NewSummaryService(store)
		transactionParams := schemas.SummaryTransactionParamModel{Frequency: "monthly"}
		accountParams := schemas.SummaryParamModel{}
		categoryParams := schemas.SummaryParamModel{}

		_, _, _, err := service.GetAllSummaries(context.Background(), transactionParams, accountParams, categoryParams)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})

	t.Run("returns error from category summary", func(t *testing.T) {
		expectedErr := errors.New("category error")
		store := &mockSummaryStore{
			getTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{}, nil
			},
			getAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{}, nil
			},
			getCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{}, expectedErr
			},
		}

		service := NewSummaryService(store)
		transactionParams := schemas.SummaryTransactionParamModel{Frequency: "monthly"}
		accountParams := schemas.SummaryParamModel{}
		categoryParams := schemas.SummaryParamModel{}

		_, _, _, err := service.GetAllSummaries(context.Background(), transactionParams, accountParams, categoryParams)
		if err != expectedErr {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}
