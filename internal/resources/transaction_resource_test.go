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

// MockTransactionTemplateService is a mock implementation for testing template operations
type MockTransactionTemplateService struct {
	ListFunc   func(ctx context.Context, params schemas.SearchParamTransactionTemplateSchema) (*schemas.PaginatedTransactionTemplateSchema, error)
	GetFunc    func(ctx context.Context, id int) (*schemas.TransactionTemplateSchema, error)
	CreateFunc func(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error)
	UpdateFunc func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error)
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

func (m *MockTransactionTemplateService) List(ctx context.Context, params schemas.SearchParamTransactionTemplateSchema) (*schemas.PaginatedTransactionTemplateSchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return &schemas.PaginatedTransactionTemplateSchema{}, nil
}

func (m *MockTransactionTemplateService) Get(ctx context.Context, id int) (*schemas.TransactionTemplateSchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return &schemas.TransactionTemplateSchema{}, nil
}

func (m *MockTransactionTemplateService) Create(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, input)
	}
	return &schemas.TransactionTemplateSchema{}, nil
}

func (m *MockTransactionTemplateService) Update(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, input)
	}
	return &schemas.TransactionTemplateSchema{}, nil
}

func (m *MockTransactionTemplateService) Delete(ctx context.Context, id int) error {
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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

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

		templateService := &MockTransactionTemplateService{}
		resource := NewTransactionResource(service, templateService)
		resource.RegisterRoutes(api)

		resp := api.Delete("/transactions/999")
		if resp.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})
}

// TestTransactionTemplateErrorHandling tests that the resource layer properly handles
// validation errors from the service layer
func TestTransactionTemplateErrorHandling(t *testing.T) {
	t.Run("CreateTemplate returns 404 when account not found", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrAccountNotFound
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Post("/transactions/templates", map[string]any{
			"type":       "expense",
			"accountId":  999,
			"categoryId": 1,
			"amount":     50000,
			"recurrence": "monthly",
			"startDate":  time.Now().Format(time.RFC3339),
		})

		if resp.Code != 404 {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("CreateTemplate returns 404 when category not found", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrCategoryNotFound
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Post("/transactions/templates", map[string]any{
			"type":       "expense",
			"accountId":  1,
			"categoryId": 999,
			"amount":     50000,
			"recurrence": "monthly",
			"startDate":  time.Now().Format(time.RFC3339),
		})

		if resp.Code != 404 {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("CreateTemplate returns 422 when type doesn't match category", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrTransactionTypeCategoryMismatch
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Post("/transactions/templates", map[string]any{
			"type":       "expense",
			"accountId":  1,
			"categoryId": 1,
			"amount":     50000,
			"recurrence": "monthly",
			"startDate":  time.Now().Format(time.RFC3339),
		})

		if resp.Code != 422 {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})

	t.Run("CreateTemplate returns 422 when invalid account type for expense", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			CreateFunc: func(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrInvalidAccountTypeForExpense
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Post("/transactions/templates", map[string]any{
			"type":       "expense",
			"accountId":  1,
			"categoryId": 1,
			"amount":     50000,
			"recurrence": "monthly",
			"startDate":  time.Now().Format(time.RFC3339),
		})

		if resp.Code != 422 {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})

	t.Run("UpdateTemplate returns 404 when account not found", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrAccountNotFound
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Patch("/transactions/templates/1", map[string]any{
			"accountId": 999,
		})

		if resp.Code != 404 {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("UpdateTemplate returns 404 when category not found", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrCategoryNotFound
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Patch("/transactions/templates/1", map[string]any{
			"categoryId": 999,
		})

		if resp.Code != 404 {
			t.Errorf("expected status 404, got %d", resp.Code)
		}
	})

	t.Run("UpdateTemplate returns 422 when type doesn't match category", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrTransactionTypeCategoryMismatch
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Patch("/transactions/templates/1", map[string]any{
			"type": "income",
		})

		if resp.Code != 422 {
			t.Errorf("expected status 422, got %d", resp.Code)
		}
	})

	t.Run("UpdateTemplate returns 400 when no fields to update", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, repositories.ErrNoFieldsToUpdate
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Patch("/transactions/templates/1", map[string]any{})

		if resp.Code != 400 {
			t.Errorf("expected status 400, got %d", resp.Code)
		}
	})

	t.Run("UpdateTemplate returns 500 for unexpected errors", func(t *testing.T) {
		_, api := humatest.New(t)

		mockService := &MockTransactionService{}
		mockTemplateService := &MockTransactionTemplateService{
			UpdateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
				return nil, errors.New("unexpected database error")
			},
		}

		resource := NewTransactionResource(mockService, mockTemplateService)
		resource.RegisterRoutes(api)

		resp := api.Patch("/transactions/templates/1", map[string]any{
			"amount": 75000,
		})

		if resp.Code != 500 {
			t.Errorf("expected status 500, got %d", resp.Code)
		}
	})
}
