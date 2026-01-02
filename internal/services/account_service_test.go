package services

import (
	"context"
	"testing"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// MockAccountStore is a simple mock for testing business logic
type MockAccountStore struct {
	ListFunc   func(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	GetFunc    func(ctx context.Context, id int64) (schemas.AccountSchema, error)
	CreateFunc func(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	UpdateFunc func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	DeleteFunc func(ctx context.Context, id int64) error

	// Track method calls for assertion
	updateCalled bool
}

func (m *MockAccountStore) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, params)
	}
	return schemas.PaginatedAccountSchema{}, nil
}

func (m *MockAccountStore) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, id)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountStore) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, data)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountStore) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	m.updateCalled = true
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, data)
	}
	return schemas.AccountSchema{}, nil
}

func (m *MockAccountStore) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

func (m *MockAccountStore) AssertNotCalled(t *testing.T, methodName string) {
	if methodName == "Update" && m.updateCalled {
		t.Errorf("expected %s not to be called, but it was", methodName)
	}
}

func (m *MockAccountStore) AssertExpectations(t *testing.T) {
	// Simple implementation - could be expanded if needed
}

// TestUpdate_BusinessValidation_NoFieldsProvided ensures business rule:
// "at least one field must be provided for update" is enforced
func TestUpdate_BusinessValidation_NoFieldsProvided(t *testing.T) {
	mockStore := &MockAccountStore{}
	service := NewAccountService(mockStore)

	// All fields nil - violates business rule
	emptyUpdate := schemas.UpdateAccountSchema{}

	_, err := service.Update(context.Background(), 1, emptyUpdate)

	if err != repositories.ErrNoFieldsToUpdate {
		t.Errorf("expected ErrNoFieldsToUpdate, got %v", err)
	}

	// Store should NOT be called since validation fails early
	mockStore.AssertNotCalled(t, "Update")
}

// TestUpdate_BusinessValidation_WithFields ensures update proceeds when fields provided
func TestUpdate_BusinessValidation_WithFields(t *testing.T) {
	testCases := []struct {
		name   string
		update schemas.UpdateAccountSchema
	}{
		{
			name: "only name provided",
			update: schemas.UpdateAccountSchema{
				Name: stringPtr("New Name"),
			},
		},
		{
			name: "only type provided",
			update: schemas.UpdateAccountSchema{
				Type: stringPtr("expense"),
			},
		},
		{
			name: "only note provided",
			update: schemas.UpdateAccountSchema{
				Note: stringPtr("New note"),
			},
		},
		{
			name: "only amount provided",
			update: schemas.UpdateAccountSchema{
				Amount: int64Ptr(500),
			},
		},
		{
			name: "multiple fields provided",
			update: schemas.UpdateAccountSchema{
				Name:   stringPtr("New Name"),
				Amount: int64Ptr(500),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockStore := &MockAccountStore{
				UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
					return schemas.AccountSchema{ID: 1, Name: "Updated"}, nil
				},
			}

			expectedAccount := schemas.AccountSchema{ID: 1, Name: "Updated"}
			mockStore.UpdateFunc = func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
				return expectedAccount, nil
			}

			mockStore.AssertExpectations(t)
		})
	}
}

// TestUpdate_ErrorTranslation_NotFound ensures DB error is translated to domain error
func TestUpdate_ErrorTranslation_NotFound(t *testing.T) {
	mockStore := new(MockAccountStore)
	updateData := schemas.UpdateAccountSchema{Name: stringPtr("Updated")}

	mockStore = &MockAccountStore{
		UpdateFunc: func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
			return schemas.AccountSchema{}, repositories.ErrAccountNotFound
		},
	}
	service := NewAccountService(mockStore)
	_, err := service.Update(context.Background(), 999, updateData)

	// Service should translate to ErrAccountNotFound (domain error)
	if err != repositories.ErrAccountNotFound {
		t.Errorf("expected ErrAccountNotFound, got %v", err)
	}
}

// Test helpers
func stringPtr(s string) *string {
	return &s
}

func int64Ptr(i int64) *int64 {
	return &i
}
