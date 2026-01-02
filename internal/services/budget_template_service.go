package services

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type BudgetTemplateStore interface {
	List(ctx context.Context, params schemas.SearchParamBudgetTemplateSchema) (*schemas.PaginatedBudgetTemplateSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetTemplateSchema, error)
	Create(ctx context.Context, input schemas.CreateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error)
	Delete(ctx context.Context, id int) error
	GetActiveTemplates(ctx context.Context) ([]schemas.BudgetTemplateSchema, error)
}

type BudgetTemplateService struct {
	store BudgetTemplateStore
}

func NewBudgetTemplateService(store BudgetTemplateStore) *BudgetTemplateService {
	return &BudgetTemplateService{store: store}
}

// List retrieves paginated budget templates with pagination validation
func (s *BudgetTemplateService) List(ctx context.Context, params schemas.SearchParamBudgetTemplateSchema) (*schemas.PaginatedBudgetTemplateSchema, error) {
	maxPageSize := 100
	defaultPageSize := 10

	// Enforce maximum page size (performance constraint)
	if params.Limit > maxPageSize {
		params.Limit = maxPageSize
	}
	if params.Limit <= 0 {
		params.Limit = defaultPageSize
	}

	// Ensure valid page number
	if params.Page <= 0 {
		params.Page = 1
	}

	return s.store.List(ctx, params)
}

// Get retrieves a single budget template by ID
func (s *BudgetTemplateService) Get(ctx context.Context, id int) (*schemas.BudgetTemplateSchema, error) {
	template, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get budget template: %w", err)
	}
	if template == nil {
		return nil, nil
	}
	return template, nil
}

// Create validates and creates a new budget template
func (s *BudgetTemplateService) Create(ctx context.Context, input schemas.CreateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error) {
	// Sanitize note field
	input.Note = utils.SanitizeString(input.Note)

	// Validate business rules
	if err := input.Validate(); err != nil {
		return nil, err
	}

	template, err := s.store.Create(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to create budget template: %w", err)
	}

	return template, nil
}

// Update validates and updates an existing budget template
func (s *BudgetTemplateService) Update(ctx context.Context, id int, input schemas.UpdateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error) {
	// Sanitize note field if provided
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	// Check if template exists
	existing, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get budget template: %w", err)
	}
	if existing == nil {
		return nil, nil
	}

	// Check if there are any changes
	if !input.HasChanges() {
		return existing, nil
	}

	template, err := s.store.Update(ctx, id, input)
	if err != nil {
		return nil, fmt.Errorf("failed to update budget template: %w", err)
	}

	return template, nil
}

// Delete soft-deletes a budget template
func (s *BudgetTemplateService) Delete(ctx context.Context, id int) error {
	// Check if template exists
	existing, err := s.store.Get(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get budget template: %w", err)
	}
	if existing == nil {
		return nil
	}

	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete budget template: %w", err)
	}

	return nil
}

// GetActiveTemplates retrieves templates that should generate budgets
func (s *BudgetTemplateService) GetActiveTemplates(ctx context.Context) ([]schemas.BudgetTemplateSchema, error) {
	templates, err := s.store.GetActiveTemplates(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get active templates: %w", err)
	}
	return templates, nil
}
