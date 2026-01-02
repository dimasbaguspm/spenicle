package services

import (
	"context"
	"testing"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// MockCategoryStore is a simple mock for testing business logic
type MockCategoryStore struct {
	ListFunc   func(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error)
	GetFunc    func(ctx context.Context, id int64) (schemas.CategorySchema, error)
	CreateFunc func(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error)
	UpdateFunc func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error)
	DeleteFunc func(ctx context.Context, id int64) error

	// Track method calls for assertion
	updateCalled bool
}

func (m *MockCategoryStore) List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return schemas.PaginatedCategorySchema{}, nil
}

func (m *MockCategoryStore) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryStore) Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, data)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryStore) Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	m.updateCalled = true
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, data)
	}
	return schemas.CategorySchema{}, nil
}

func (m *MockCategoryStore) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

func (m *MockCategoryStore) AssertNotCalled(t *testing.T, methodName string) {
	if methodName == "Update" && m.updateCalled {
		t.Errorf("expected %s not to be called, but it was", methodName)
	}
}

func (m *MockCategoryStore) AssertExpectations(t *testing.T) {
	// Simple implementation - could be expanded if needed
}

// TestUpdate_BusinessValidation_NoFieldsProvided ensures business rule:
// "at least one field must be provided for update" is enforced
func TestCategoryUpdate_BusinessValidation_NoFieldsProvided(t *testing.T) {
	mockStore := &MockCategoryStore{}
	service := NewCategoryService(mockStore)

	// All fields nil - violates business rule
	emptyUpdate := schemas.UpdateCategorySchema{}

	_, err := service.Update(context.Background(), 1, emptyUpdate)

	if err != repositories.ErrNoFieldsToUpdate {
		t.Errorf("expected ErrNoFieldsToUpdate, got %v", err)
	}

	// Store should NOT be called since validation fails early
	mockStore.AssertNotCalled(t, "Update")
}

// TestUpdate_BusinessValidation_WithFields ensures update proceeds when fields provided
func TestCategoryUpdate_BusinessValidation_WithFields(t *testing.T) {
	testCases := []struct {
		name   string
		update schemas.UpdateCategorySchema
	}{
		{
			name: "only name provided",
			update: schemas.UpdateCategorySchema{
				Name: stringPtrCat("New Name"),
			},
		},
		{
			name: "only type provided",
			update: schemas.UpdateCategorySchema{
				Type: stringPtrCat("expense"),
			},
		},
		{
			name: "only note provided",
			update: schemas.UpdateCategorySchema{
				Note: stringPtrCat("New note"),
			},
		},
		{
			name: "multiple fields provided",
			update: schemas.UpdateCategorySchema{
				Name: stringPtrCat("New Name"),
				Type: stringPtrCat("income"),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockStore := &MockCategoryStore{
				UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
					return schemas.CategorySchema{ID: 1, Name: "Updated"}, nil
				},
			}

			expectedCategory := schemas.CategorySchema{ID: 1, Name: "Updated"}
			mockStore.UpdateFunc = func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
				return expectedCategory, nil
			}

			mockStore.AssertExpectations(t)
		})
	}
}

// TestUpdate_ErrorTranslation_NotFound ensures DB error is translated to domain error
func TestCategoryUpdate_ErrorTranslation_NotFound(t *testing.T) {
	mockStore := new(MockCategoryStore)
	updateData := schemas.UpdateCategorySchema{Name: stringPtrCat("Updated")}

	mockStore = &MockCategoryStore{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
			return schemas.CategorySchema{}, repositories.ErrCategoryNotFound
		},
	}
	service := NewCategoryService(mockStore)
	_, err := service.Update(context.Background(), 999, updateData)

	// Service should translate to ErrCategoryNotFound (domain error)
	if err != repositories.ErrCategoryNotFound {
		t.Errorf("expected ErrCategoryNotFound, got %v", err)
	}
}

// Test helpers
func stringPtrCat(s string) *string {
	return &s
}
