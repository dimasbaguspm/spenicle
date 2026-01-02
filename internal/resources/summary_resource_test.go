package resources

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

// MockSummaryService is a mock implementation for testing HTTP layer
type MockSummaryService struct {
	GetTransactionSummaryFunc func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error)
	GetAccountSummaryFunc     func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error)
	GetCategorySummaryFunc    func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error)
}

func (m *MockSummaryService) GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
	if m.GetTransactionSummaryFunc != nil {
		return m.GetTransactionSummaryFunc(ctx, params)
	}
	return schemas.SummaryTransactionSchema{}, nil
}

func (m *MockSummaryService) GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
	if m.GetAccountSummaryFunc != nil {
		return m.GetAccountSummaryFunc(ctx, params)
	}
	return schemas.SummaryAccountSchema{}, nil
}

func (m *MockSummaryService) GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
	if m.GetCategorySummaryFunc != nil {
		return m.GetCategorySummaryFunc(ctx, params)
	}
	return schemas.SummaryCategorySchema{}, nil
}

func TestSummaryResourceGetTransactionSummary(t *testing.T) {
	t.Run("successfully gets transaction summary", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{
					Frequency: "monthly",
					Data: []schemas.SummaryTransactionItem{
						{Period: "2024-01", TotalCount: 100, Net: 1000000},
					},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/transactions")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets transaction summary with frequency param", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				if params.Frequency != "daily" {
					t.Errorf("expected frequency 'daily', got %s", params.Frequency)
				}
				return schemas.SummaryTransactionSchema{
					Frequency: "daily",
					Data:      []schemas.SummaryTransactionItem{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/transactions?frequency=daily")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets transaction summary with date range", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				if params.StartDate.IsZero() {
					t.Error("expected start_date to be set")
				}
				if params.EndDate.IsZero() {
					t.Error("expected end_date to be set")
				}
				return schemas.SummaryTransactionSchema{
					Frequency: "monthly",
					Data:      []schemas.SummaryTransactionItem{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/transactions?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetTransactionSummaryFunc: func(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
				return schemas.SummaryTransactionSchema{}, errors.New("database error")
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/transactions")
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}

func TestSummaryResourceGetAccountSummary(t *testing.T) {
	t.Run("successfully gets account summary", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{
					Data: []schemas.SummaryAccountModel{
						{AccountID: 1, AccountName: "Cash", TotalCount: 50, Net: 500000},
					},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/accounts")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets account summary with date range", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				if params.StartDate.IsZero() {
					t.Error("expected start_date to be set")
				}
				return schemas.SummaryAccountSchema{
					Data: []schemas.SummaryAccountModel{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/accounts?startDate=2024-01-01T00:00:00Z")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountSummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
				return schemas.SummaryAccountSchema{}, errors.New("database error")
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/accounts")
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}

func TestSummaryResourceGetCategorySummary(t *testing.T) {
	t.Run("successfully gets category summary", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{
					Data: []schemas.SummaryCategoryModel{
						{CategoryID: 1, CategoryName: "Food", TotalCount: 75, Net: -1500000},
					},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/categories")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets category summary with date range", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				if params.StartDate.IsZero() || params.EndDate.IsZero() {
					t.Error("expected start_date and end_date to be set")
				}
				return schemas.SummaryCategorySchema{
					Data: []schemas.SummaryCategoryModel{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategorySummaryFunc: func(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
				return schemas.SummaryCategorySchema{}, errors.New("database error")
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		resp := api.Get("/summary/categories")
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}
