package resources

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// MockTransactionService is a mock implementation for testing HTTP layer
type MockTransactionService struct {
	ListFunc   func(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error)
	GetFunc    func(ctx context.Context, id int) (schemas.TransactionSchema, error)
	CreateFunc func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error)
	UpdateFunc func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error)
	DeleteFunc func(ctx context.Context, id int) error
}

func (m *MockTransactionService) List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return schemas.PaginatedTransactionSchema{}, nil
}

func (m *MockTransactionService) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return schemas.TransactionSchema{}, nil
}

func (m *MockTransactionService) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, input)
	}
	return schemas.TransactionSchema{}, nil
}

func (m *MockTransactionService) Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, input)
	}
	return schemas.TransactionSchema{}, nil
}

func (m *MockTransactionService) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

func TestTransactionResourceList(t *testing.T) {
	t.Run("successfully lists transactions", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockTransactionService{
			ListFunc: func(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
				return schemas.PaginatedTransactionSchema{
					Data:       []schemas.TransactionSchema{},
					Page:       1,
					Limit:      10,
					TotalItems: 0,
					TotalPages: 0,
				}, nil
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Get("/transactions")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 500 on service error", func(t *testing.T) {
		_, api := humatest.New(t)

		service := &MockTransactionService{
			ListFunc: func(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
				return schemas.PaginatedTransactionSchema{}, errors.New("database error")
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Get("/transactions")
		if resp.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}

func TestTransactionResourceGet(t *testing.T) {
	t.Run("successfully gets transaction", func(t *testing.T) {
		_, api := humatest.New(t)
		now := time.Now()
		service := &MockTransactionService{
			GetFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     50000,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Get("/transactions/1")
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 404 when transaction not found", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			GetFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrTransactionNotFound
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Get("/transactions/999")
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})
}

func TestTransactionResourceCreate(t *testing.T) {
	t.Run("successfully creates transaction", func(t *testing.T) {
		_, api := humatest.New(t)
		now := time.Now()
		service := &MockTransactionService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       input.Type,
					Date:       now,
					Amount:     input.Amount,
					AccountID:  input.AccountID,
					CategoryID: input.CategoryID,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Post("/transactions", map[string]any{
			"type":       repositories.TransactionExpenseType,
			"amount":     50000,
			"accountId":  1,
			"categoryId": 1,
		})
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 422 when type doesn't match category", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrTransactionTypeCategoryMismatch
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Post("/transactions", map[string]any{
			"type":       repositories.TransactionExpenseType,
			"amount":     50000,
			"accountId":  1,
			"categoryId": 1,
		})
		if resp.Code != http.StatusUnprocessableEntity {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})

	t.Run("returns 422 when invalid account type for expense", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrInvalidAccountTypeForExpense
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Post("/transactions", map[string]any{
			"type":       repositories.TransactionExpenseType,
			"amount":     50000,
			"accountId":  1,
			"categoryId": 1,
		})
		if resp.Code != http.StatusUnprocessableEntity {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})

	t.Run("returns 404 when account not found", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrAccountNotFound
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Post("/transactions", map[string]any{
			"type":       repositories.TransactionExpenseType,
			"amount":     50000,
			"accountId":  999,
			"categoryId": 1,
		})
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("returns 404 when category not found", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrCategoryNotFound
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Post("/transactions", map[string]any{
			"type":       repositories.TransactionExpenseType,
			"amount":     50000,
			"accountId":  1,
			"categoryId": 999,
		})
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})
}

func TestTransactionResourceUpdate(t *testing.T) {
	t.Run("successfully updates transaction", func(t *testing.T) {
		_, api := humatest.New(t)
		now := time.Now()
		service := &MockTransactionService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     *input.Amount,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Patch("/transactions/1", map[string]any{
			"amount": 75000,
		})
		if resp.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", resp.Code)
		}
	})

	t.Run("returns 400 when no fields to update", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrNoFieldsToUpdate
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Patch("/transactions/1", map[string]any{})
		if resp.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", resp.Code)
		}
	})

	t.Run("returns 404 when transaction not found", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrTransactionNotFound
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Patch("/transactions/999", map[string]any{
			"amount": 75000,
		})
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("returns 422 when type-category mismatch", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrTransactionTypeCategoryMismatch
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Patch("/transactions/1", map[string]any{
			"type": repositories.TransactionExpenseType,
		})
		if resp.Code != http.StatusUnprocessableEntity {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})
}

func TestTransactionResourceDelete(t *testing.T) {
	t.Run("successfully deletes transaction", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			DeleteFunc: func(ctx context.Context, id int) error {
				return nil
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Delete("/transactions/1")
		if resp.Code != http.StatusNoContent {
			t.Errorf("expected status 204, got %d", resp.Code)
		}
	})

	t.Run("returns 404 when transaction not found", func(t *testing.T) {
		_, api := humatest.New(t)
		service := &MockTransactionService{
			DeleteFunc: func(ctx context.Context, id int) error {
				return repositories.ErrTransactionNotFound
			},
		}

		resource := NewTransactionResource(service)
		resource.RegisterRoutes(api, "")

		resp := api.Delete("/transactions/999")
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})
}
