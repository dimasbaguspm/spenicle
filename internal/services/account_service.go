package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type AccountStore interface {
	List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	Get(ctx context.Context, id int64) (schemas.AccountSchema, error)
	Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	Delete(ctx context.Context, id int64) error
}

type AccountService struct {
	store AccountStore
}

func NewAccountService(store AccountStore) *AccountService {
	return &AccountService{store: store}
}

func (s *AccountService) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
	maxPageSize := 100
	defaultPageSize := 10

	// Enforce maximum page size (performance constraint)
	if params.PageSize > maxPageSize {
		params.PageSize = maxPageSize
	}
	if params.PageSize <= 0 {
		params.PageSize = defaultPageSize
	}

	// Ensure valid page number
	if params.PageNumber <= 0 {
		params.PageNumber = 1
	}

	return s.store.List(ctx, params)
}

// Get retrieves a single account by ID.
func (s *AccountService) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	account, err := s.store.Get(ctx, id)
	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("failed to get account: %w", err)
	}
	return account, nil
}

// Create validates and creates a new account.
func (s *AccountService) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	account, err := s.store.Create(ctx, data)
	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("failed to create account: %w", err)
	}
	return account, nil
}

// Update validates and updates an existing account.
func (s *AccountService) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	if data.Name == nil && data.Type == nil && data.Note == nil && data.Amount == nil {
		return schemas.AccountSchema{}, repositories.ErrNoFieldsToUpdate
	}

	account, err := s.store.Update(ctx, id, data)
	if err != nil {
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return schemas.AccountSchema{}, repositories.ErrAccountNotFound
		}
		return schemas.AccountSchema{}, fmt.Errorf("failed to update account: %w", err)
	}
	return account, nil
}

// Delete soft-deletes an account.
func (s *AccountService) Delete(ctx context.Context, id int64) error {
	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete account: %w", err)
	}
	return nil
}
