package resources

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// MockCategoryService is a mock implementation of CategoryService for testing HTTP layer
type MockCategoryService struct {
	ListFunc    func(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error)
	GetFunc     func(ctx context.Context, id int64) (schemas.CategorySchema, error)
	CreateFunc  func(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error)
	UpdateFunc  func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error)
	DeleteFunc  func(ctx context.Context, id int64) error
	ReorderFunc func(ctx context.Context, data schemas.CategoryReorderSchema) error
}

func (m *MockCategoryService) List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return schemas.PaginatedCategorySchema{}, nil
}

func (m *MockCategoryService) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryService) Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, data)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryService) Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, data)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryService) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

func (m *MockCategoryService) Reorder(ctx context.Context, data schemas.CategoryReorderSchema) error {
	if m.ReorderFunc != nil {
		return m.ReorderFunc(ctx, data)
	}
	return nil
}

// setupTestCategoryAPI creates a test API with routes registered
func setupTestCategoryAPI(t *testing.T, mockService *MockCategoryService) (humatest.TestAPI, *CategoryResource) {
	_, api := humatest.New(t)
	resource := &CategoryResource{service: mockService}
	resource.RegisterRoutes(api)
	return api, resource
}

func TestCategoryResource_GetPaginated_Success(t *testing.T) {
	mockService := &MockCategoryService{
		ListFunc: func(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
			return schemas.PaginatedCategorySchema{
				PageTotal:  1,
				PageNumber: 1,
				PageSize:   10,
				TotalCount: 2,
				Items: []schemas.CategorySchema{
					{ID: 1, Name: "Food", Type: repositories.CategoryTypeExpense},
					{ID: 2, Name: "Salary", Type: repositories.CategoryTypeIncome},
				},
			}, nil
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Get("/categories")

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestCategoryResource_Get_Success(t *testing.T) {
	now := time.Now().UTC()
	mockService := &MockCategoryService{
		GetFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{
				ID:        1,
				Name:      "Food",
				Type:      repositories.CategoryTypeExpense,
				Note:      "Dining and groceries",
				CreatedAt: now,
			}, nil
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Get("/categories/1")

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestCategoryResource_Get_NotFound(t *testing.T) {
	mockService := &MockCategoryService{
		GetFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{}, repositories.ErrCategoryNotFound
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Get("/categories/999")

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", resp.Code)
	}
}

func TestCategoryResource_Create_Success(t *testing.T) {
	now := time.Now().UTC()
	mockService := &MockCategoryService{
		CreateFunc: func(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{
				ID:        1,
				Name:      data.Name,
				Type:      data.Type,
				Note:      data.Note,
				CreatedAt: now,
			}, nil
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Post("/categories", map[string]any{
		"name": "Food",
		"type": repositories.CategoryTypeExpense,
		"note": "Groceries",
	})

	if resp.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", resp.Code)
	}
}

func TestCategoryResource_Update_Success(t *testing.T) {
	now := time.Now().UTC()
	mockService := &MockCategoryService{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{
				ID:        id,
				Name:      *data.Name,
				Type:      repositories.CategoryTypeExpense,
				CreatedAt: now,
			}, nil
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Patch("/categories/1", map[string]any{
		"name": "Food Updated",
	})

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
}

func TestCategoryResource_Update_NotFound(t *testing.T) {
	mockService := &MockCategoryService{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{}, repositories.ErrCategoryNotFound
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Patch("/categories/999", map[string]any{
		"name": "Updated",
	})

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", resp.Code)
	}
}

func TestCategoryResource_Delete_Success(t *testing.T) {
	mockService := &MockCategoryService{
		DeleteFunc: func(ctx context.Context, id int64) error {
			return nil
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Delete("/categories/1")

	if resp.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", resp.Code)
	}
}

func TestCategoryResource_Delete_NotFound(t *testing.T) {
	mockService := &MockCategoryService{
		DeleteFunc: func(ctx context.Context, id int64) error {
			return repositories.ErrCategoryNotFound
		},
	}

	api, _ := setupTestCategoryAPI(t, mockService)
	resp := api.Delete("/categories/999")

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", resp.Code)
	}
}
