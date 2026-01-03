package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type AccountStore interface {
	List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	Get(ctx context.Context, id int64) (schemas.AccountSchema, error)
	Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	Delete(ctx context.Context, id int64) error
	Reorder(ctx context.Context, items []schemas.AccountReorderItemSchema) error
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
	data.Name = utils.SanitizeString(data.Name)
	data.Note = utils.SanitizeString(data.Note)

	// Validate sanitized name is not empty after sanitization
	if data.Name == "" {
		return schemas.AccountSchema{}, errors.New("name cannot be empty after sanitization")
	}

	account, err := s.store.Create(ctx, data)
	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("failed to create account: %w", err)
	}
	return account, nil
}

// Update validates and updates an existing account.
func (s *AccountService) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	if data.Name == nil && data.Type == nil && data.Note == nil && data.Amount == nil && data.Icon == nil && data.IconColor == nil && data.ArchivedAt == nil {
		return schemas.AccountSchema{}, repositories.ErrNoFieldsToUpdate
	}

	data.Name = utils.SanitizeStringPtr(data.Name)
	data.Note = utils.SanitizeStringPtr(data.Note)

	// Validate name is not empty after sanitization (if provided)
	if data.Name != nil && *data.Name == "" {
		return schemas.AccountSchema{}, errors.New("name cannot be empty after sanitization")
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

// Reorder atomically updates display order for multiple accounts.
// Validates that all IDs are unique to prevent data integrity issues.
func (s *AccountService) Reorder(ctx context.Context, items []schemas.AccountReorderItemSchema) error {
	// Validate uniqueness of IDs
	idSet := make(map[int64]bool, len(items))
	for _, item := range items {
		if idSet[item.ID] {
			return errors.New("duplicate account ID in reorder request")
		}
		idSet[item.ID] = true
	}

	if err := s.store.Reorder(ctx, items); err != nil {
		return fmt.Errorf("failed to reorder accounts: %w", err)
	}
	return nil
}
