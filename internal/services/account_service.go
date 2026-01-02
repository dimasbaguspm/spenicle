package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/jackc/pgx/v5"
)

var (
	ErrAccountNotFound    = errors.New("account not found")
	ErrNoFieldsToUpdate   = errors.New("at least one field must be provided to update")
	ErrInvalidAccountData = errors.New("invalid account data")
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
	return s.store.List(ctx, params)
}

func (s *AccountService) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	account, err := s.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.AccountSchema{}, ErrAccountNotFound
		}
		return schemas.AccountSchema{}, fmt.Errorf("failed to get account: %w", err)
	}
	return account, nil
}

func (s *AccountService) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	// Add business validation here if needed
	// Example: validate account type-specific rules, amount limits, etc.

	account, err := s.store.Create(ctx, data)
	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("failed to create account: %w", err)
	}
	return account, nil
}

// Update validates and updates an existing account.
func (s *AccountService) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	// Business validation: at least one field must be provided
	if data.Name == nil && data.Type == nil && data.Note == nil && data.Amount == nil {
		return schemas.AccountSchema{}, ErrNoFieldsToUpdate
	}

	account, err := s.store.Update(ctx, id, data)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.AccountSchema{}, ErrAccountNotFound
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
