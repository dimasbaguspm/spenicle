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
	GetAccountTrendFunc       func(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error)
	GetCategoryTrendFunc      func(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error)
	GetTagSummaryFunc         func(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error)
	GetTotalSummaryFunc       func(ctx context.Context, params schemas.TotalSummaryParamModel) (schemas.TotalSummarySchema, error)
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

func (m *MockSummaryService) GetAccountTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
	if m.GetAccountTrendFunc != nil {
		return m.GetAccountTrendFunc(ctx, params)
	}
	return schemas.AccountTrendSchema{}, nil
}

func (m *MockSummaryService) GetCategoryTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
	if m.GetCategoryTrendFunc != nil {
		return m.GetCategoryTrendFunc(ctx, params)
	}
	return schemas.CategoryTrendSchema{}, nil
}

func (m *MockSummaryService) GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error) {
	if m.GetTagSummaryFunc != nil {
		return m.GetTagSummaryFunc(ctx, params)
	}
	return schemas.SummaryTagSchema{}, nil
}

func (m *MockSummaryService) GetTotalSummary(ctx context.Context, params schemas.TotalSummaryParamModel) (schemas.TotalSummarySchema, error) {
	if m.GetTotalSummaryFunc != nil {
		return m.GetTotalSummaryFunc(ctx, params)
	}
	return schemas.TotalSummarySchema{}, nil
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/transactions?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/transactions?frequency=daily&startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/transactions?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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
				if params.EndDate.IsZero() {
					t.Error("expected end_date to be set")
				}
				return schemas.SummaryAccountSchema{
					Data: []schemas.SummaryAccountModel{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
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

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}

func TestSummaryResourceGetAccountTrends(t *testing.T) {
	t.Run("successfully gets account trends", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
				return schemas.AccountTrendSchema{
					Frequency: "monthly",
					Data: []schemas.AccountTrendItem{
						{
							AccountID:   1,
							AccountName: "Cash",
							TrendStatus: "increasing",
							AvgChange:   10.5,
							Periods: []schemas.TrendItem{
								{
									Period:        "2024-01",
									TotalAmount:   1000000,
									Net:           200000,
									Count:         10,
									ChangePercent: 0,
									Trend:         "stable",
								},
								{
									Period:        "2024-02",
									TotalAmount:   1200000,
									Net:           250000,
									Count:         12,
									ChangePercent: 20.0,
									Trend:         "increasing",
								},
							},
						},
					},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 3, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339) + "&frequency=monthly")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets weekly account trends", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
				if params.Frequency != "weekly" {
					t.Errorf("expected frequency 'weekly', got %s", params.Frequency)
				}
				return schemas.AccountTrendSchema{
					Frequency: "weekly",
					Data:      []schemas.AccountTrendItem{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339) + "&frequency=weekly")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetAccountTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
				return schemas.AccountTrendSchema{}, errors.New("database error")
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/accounts/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}

func TestSummaryResourceGetCategoryTrends(t *testing.T) {
	t.Run("successfully gets category trends", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategoryTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
				return schemas.CategoryTrendSchema{
					Frequency: "monthly",
					Data: []schemas.CategoryTrendItem{
						{
							CategoryID:   1,
							CategoryName: "Food",
							CategoryType: "expense",
							TrendStatus:  "decreasing",
							AvgChange:    -5.2,
							Periods: []schemas.TrendItem{
								{
									Period:        "2024-01",
									TotalAmount:   1000000,
									ExpenseAmount: 1000000,
									Net:           -1000000,
									Count:         20,
									ChangePercent: 0,
									Trend:         "stable",
								},
								{
									Period:        "2024-02",
									TotalAmount:   900000,
									ExpenseAmount: 900000,
									Net:           -900000,
									Count:         18,
									ChangePercent: -10.0,
									Trend:         "decreasing",
								},
							},
						},
					},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 3, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339) + "&frequency=monthly")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("successfully gets weekly category trends", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategoryTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
				if params.Frequency != "weekly" {
					t.Errorf("expected frequency 'weekly', got %s", params.Frequency)
				}
				return schemas.CategoryTrendSchema{
					Frequency: "weekly",
					Data:      []schemas.CategoryTrendItem{},
				}, nil
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339) + "&frequency=weekly")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockSummaryService{
			GetCategoryTrendFunc: func(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
				return schemas.CategoryTrendSchema{}, errors.New("database error")
			},
		}

		resource := NewSummaryResource(service)
		resource.RegisterRoutes(api)

		start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		resp := api.Get("/summary/categories/trends?startDate=" + start.Format(time.RFC3339) + "&endDate=" + end.Format(time.RFC3339))
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}
