package services

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type BudgetStore interface {
	List(ctx context.Context, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetSchema, error)
	Create(ctx context.Context, input schemas.CreateBudgetSchema) (*schemas.BudgetSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateBudgetSchema) (*schemas.BudgetSchema, error)
	Delete(ctx context.Context, id int) error
	GetByAccountID(ctx context.Context, accountID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
	GetByCategoryID(ctx context.Context, categoryID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
}

type BudgetService struct {
	store BudgetStore
}

func NewBudgetService(store BudgetStore) *BudgetService {
	return &BudgetService{store: store}
}

// List retrieves paginated budgets with pagination validation
func (s *BudgetService) List(ctx context.Context, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
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

// Get retrieves a single budget by ID
func (s *BudgetService) Get(ctx context.Context, id int) (*schemas.BudgetSchema, error) {
	budget, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get budget: %w", err)
	}
	if budget == nil {
		return nil, nil
	}
	return budget, nil
}

// Create validates and creates a new budget
func (s *BudgetService) Create(ctx context.Context, input schemas.CreateBudgetSchema) (*schemas.BudgetSchema, error) {
	// Sanitize note field
	input.Note = utils.SanitizeString(input.Note)

	// Validate business rules
	if err := input.Validate(); err != nil {
		return nil, err
	}

	budget, err := s.store.Create(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to create budget: %w", err)
	}

	return budget, nil
}

// Update validates and updates an existing budget
func (s *BudgetService) Update(ctx context.Context, id int, input schemas.UpdateBudgetSchema) (*schemas.BudgetSchema, error) {
	// Sanitize note field if provided
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	// Check if budget exists
	existing, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get budget: %w", err)
	}
	if existing == nil {
		return nil, nil
	}

	// Check if there are any changes
	if !input.HasChanges() {
		return existing, nil
	}

	// Validate business rules with existing budget context
	if err := input.Validate(existing); err != nil {
		return nil, err
	}

	budget, err := s.store.Update(ctx, id, input)
	if err != nil {
		return nil, fmt.Errorf("failed to update budget: %w", err)
	}

	return budget, nil
}

// Delete soft-deletes a budget
func (s *BudgetService) Delete(ctx context.Context, id int) error {
	// Check if budget exists
	existing, err := s.store.Get(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get budget: %w", err)
	}
	if existing == nil {
		return nil
	}

	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete budget: %w", err)
	}

	return nil
}

// GetByAccountID retrieves budgets for a specific account
func (s *BudgetService) GetByAccountID(ctx context.Context, accountID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
	// Validate pagination
	if params.PageSize <= 0 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}
	if params.PageNumber <= 0 {
		params.PageNumber = 1
	}

	return s.store.GetByAccountID(ctx, accountID, params)
}

// GetByCategoryID retrieves budgets for a specific category
func (s *BudgetService) GetByCategoryID(ctx context.Context, categoryID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
	// Validate pagination
	if params.PageSize <= 0 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}
	if params.PageNumber <= 0 {
		params.PageNumber = 1
	}

	return s.store.GetByCategoryID(ctx, categoryID, params)
}
