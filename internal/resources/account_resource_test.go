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

// MockAccountService is a mock implementation of AccountService for testing HTTP layer
type MockAccountService struct {
	ListFunc   func(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	GetFunc    func(ctx context.Context, id int64) (schemas.AccountSchema, error)
	CreateFunc func(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	UpdateFunc func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	DeleteFunc func(ctx context.Context, id int64) error
}

func (m *MockAccountService) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return schemas.PaginatedAccountSchema{}, nil
}

func (m *MockAccountService) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountService) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, data)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountService) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, data)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountService) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

// setupTestAPI creates a test API with routes registered
func setupTestAPI(t *testing.T, mockService *MockAccountService) (humatest.TestAPI, *AccountResource) {
	_, api := humatest.New(t)
	resource := &AccountResource{service: mockService}
	resource.RegisterRoutes(api)
	return api, resource
}

func TestAccountResource_GetPaginated_Success(t *testing.T) {
	mockService := &MockAccountService{
		ListFunc: func(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
			return schemas.PaginatedAccountSchema{
				PageTotal:  1,
				PageNumber: 1,
				PageSize:   10,
				TotalCount: 2,
				Items: []schemas.AccountSchema{
					{ID: 1, Name: "Account 1", Type: repositories.AccountIncomeType, Amount: 1000},
					{ID: 2, Name: "Account 2", Type: repositories.AccountExpenseType, Amount: 500},
				},
			}, nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	// Test with default pagination
	resp := api.Get("/accounts")
	if resp.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.Code)
	}

	// Test with query parameters
	resp = api.Get("/accounts?page_number=1&page_size=10&name=Account")
	if resp.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.Code)
	}
}

func TestAccountResource_GetPaginated_ValidationErrors(t *testing.T) {
	mockService := &MockAccountService{}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		queryPath  string
		expectCode int
	}{
		{
			name:       "invalid type value",
			queryPath:  "/accounts?type=invalid",
			expectCode: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := api.Get(tt.queryPath)
			if resp.Code != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.Code)
			}
		})
	}
}

func TestAccountResource_GetDetail_Success(t *testing.T) {
	now := time.Now()
	mockService := &MockAccountService{
		GetFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{
				ID:        id,
				Name:      "Test Account",
				Type:      repositories.AccountIncomeType,
				Note:      "Test note",
				Amount:    5000,
				CreatedAt: now,
			}, nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Get("/accounts/1")
	if resp.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.Code)
	}
}

func TestAccountResource_GetDetail_InvalidID(t *testing.T) {
	mockService := &MockAccountService{}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		path       string
		expectCode int
	}{
		{
			name:       "invalid id - not a number",
			path:       "/accounts/abc",
			expectCode: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := api.Get(tt.path)
			if resp.Code != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.Code)
			}
		})
	}
}

func TestAccountResource_GetDetail_NotFound(t *testing.T) {
	mockService := &MockAccountService{
		GetFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{}, repositories.ErrAccountNotFound
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Get("/accounts/999")
	if resp.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp.Code)
	}
}

func TestAccountResource_Create_Success(t *testing.T) {
	now := time.Now()
	mockService := &MockAccountService{
		CreateFunc: func(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{
				ID:        1,
				Name:      data.Name,
				Type:      data.Type,
				Note:      data.Note,
				Amount:    data.Amount,
				CreatedAt: now,
			}, nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Post("/accounts", map[string]interface{}{
		"name":   "New Account",
		"type":   repositories.AccountIncomeType,
		"note":   "Test note",
		"amount": 1000,
	})
	if resp.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.Code)
	}
}

func TestAccountResource_Create_ValidationErrors(t *testing.T) {
	mockService := &MockAccountService{}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		body       map[string]interface{}
		expectCode int
	}{
		{
			name: "missing name",
			body: map[string]interface{}{
				"type":   repositories.AccountIncomeType,
				"amount": 1000,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
		{
			name: "missing type",
			body: map[string]interface{}{
				"name":   "Test",
				"amount": 1000,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
		{
			name: "invalid type",
			body: map[string]interface{}{
				"name":   "Test",
				"type":   "invalid",
				"amount": 1000,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
		{
			name: "negative amount",
			body: map[string]interface{}{
				"name":   "Test",
				"type":   repositories.AccountIncomeType,
				"amount": -100,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
		{
			name: "name too long - exceeds maxLength",
			body: map[string]interface{}{
				"name":   string(make([]byte, 256)), // 256 chars, max is 255
				"type":   repositories.AccountIncomeType,
				"amount": 1000,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := api.Post("/accounts", tt.body)
			if resp.Code != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.Code)
			}
		})
	}
}

func TestAccountResource_Update_Success(t *testing.T) {
	now := time.Now()
	mockService := &MockAccountService{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{
				ID:        id,
				Name:      *data.Name,
				Type:      repositories.AccountIncomeType,
				Note:      *data.Note,
				Amount:    5000,
				CreatedAt: now,
				UpdatedAt: &now,
			}, nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Patch("/accounts/1", map[string]interface{}{
		"name": "Updated Account",
		"note": "Updated note",
	})
	if resp.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.Code)
	}
}

func TestAccountResource_Update_ValidationErrors(t *testing.T) {
	mockService := &MockAccountService{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
			// Simulate business validation from service layer
			if data.Name == nil && data.Type == nil && data.Note == nil && data.Amount == nil {
				return schemas.AccountSchema{}, repositories.ErrNoFieldsToUpdate
			}
			return schemas.AccountSchema{ID: id}, nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		path       string
		body       map[string]interface{}
		expectCode int
	}{
		{
			name:       "no fields provided",
			path:       "/accounts/1",
			body:       map[string]interface{}{},
			expectCode: http.StatusBadRequest,
		},
		{
			name: "invalid type value",
			path: "/accounts/1",
			body: map[string]interface{}{
				"type": "invalid_type",
			},
			expectCode: http.StatusUnprocessableEntity,
		},
		{
			name: "negative amount",
			path: "/accounts/1",
			body: map[string]interface{}{
				"amount": -500,
			},
			expectCode: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := api.Patch(tt.path, tt.body)
			if resp.Code != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.Code)
			}
		})
	}
}

func TestAccountResource_Update_NotFound(t *testing.T) {
	mockService := &MockAccountService{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{}, repositories.ErrAccountNotFound
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Patch("/accounts/999", map[string]interface{}{
		"name": "Updated",
	})
	if resp.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", resp.Code)
	}
}

func TestAccountResource_Delete_Success(t *testing.T) {
	mockService := &MockAccountService{
		DeleteFunc: func(ctx context.Context, id int64) error {
			return nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	resp := api.Delete("/accounts/1")
	if resp.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", resp.Code)
	}
}

func TestAccountResource_Delete_InvalidID(t *testing.T) {
	mockService := &MockAccountService{}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		path       string
		expectCode int
	}{
		{
			name:       "invalid id - not a number",
			path:       "/accounts/xyz",
			expectCode: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := api.Delete(tt.path)
			if resp.Code != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.Code)
			}
		})
	}
}

func TestAccountResource_MethodValidation(t *testing.T) {
	mockService := &MockAccountService{}
	api, _ := setupTestAPI(t, mockService)

	tests := []struct {
		name       string
		method     string
		path       string
		expectCode int
	}{
		{
			name:       "POST not allowed on /accounts/{id}",
			method:     "POST",
			path:       "/accounts/1",
			expectCode: http.StatusMethodNotAllowed,
		},
		{
			name:       "PUT not allowed on /accounts",
			method:     "PUT",
			path:       "/accounts",
			expectCode: http.StatusMethodNotAllowed,
		},
		{
			name:       "PATCH not allowed on /accounts (list)",
			method:     "PATCH",
			path:       "/accounts",
			expectCode: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var resp *http.Response
			switch tt.method {
			case "POST":
				resp = api.Post(tt.path, map[string]interface{}{}).Result()
			case "PUT":
				resp = api.Put(tt.path, map[string]interface{}{}).Result()
			case "PATCH":
				resp = api.Patch(tt.path, map[string]interface{}{}).Result()
			}
			if resp.StatusCode != tt.expectCode {
				t.Errorf("expected status %d, got %d", tt.expectCode, resp.StatusCode)
			}
		})
	}
}

func TestAccountResource_AllEndpointsRegistered(t *testing.T) {
	mockService := &MockAccountService{
		ListFunc: func(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
			return schemas.PaginatedAccountSchema{}, nil
		},
		GetFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{ID: id}, nil
		},
		CreateFunc: func(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{Name: data.Name}, nil
		},
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{ID: id}, nil
		},
		DeleteFunc: func(ctx context.Context, id int64) error {
			return nil
		},
	}
	api, _ := setupTestAPI(t, mockService)

	endpoints := []struct {
		method string
		path   string
		body   interface{}
	}{
		{method: "GET", path: "/accounts", body: nil},
		{method: "POST", path: "/accounts", body: map[string]interface{}{"name": "Test", "type": repositories.AccountIncomeType, "amount": 100}},
		{method: "GET", path: "/accounts/1", body: nil},
		{method: "PATCH", path: "/accounts/1", body: map[string]interface{}{"name": "Updated"}},
		{method: "DELETE", path: "/accounts/1", body: nil},
	}

	for _, ep := range endpoints {
		t.Run(ep.method+" "+ep.path, func(t *testing.T) {
			var resp *http.Response
			switch ep.method {
			case "GET":
				resp = api.Get(ep.path).Result()
			case "POST":
				resp = api.Post(ep.path, ep.body).Result()
			case "PATCH":
				resp = api.Patch(ep.path, ep.body).Result()
			case "DELETE":
				resp = api.Delete(ep.path).Result()
			}

			// Should not return 404 (endpoint exists)
			if resp.StatusCode == http.StatusNotFound {
				t.Errorf("endpoint %s %s not registered", ep.method, ep.path)
			}

			// Should not return 405 (method is correct)
			if resp.StatusCode == http.StatusMethodNotAllowed {
				t.Errorf("method %s not allowed for %s", ep.method, ep.path)
			}
		})
	}
}
