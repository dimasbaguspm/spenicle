package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

// TransactionTemplateStore defines the interface for transaction template data operations
type TransactionTemplateStore interface {
	List(ctx context.Context, params schemas.SearchParamTransactionTemplateSchema) (*schemas.PaginatedTransactionTemplateSchema, error)
	Get(ctx context.Context, id int) (*schemas.TransactionTemplateSchema, error)
	Create(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error)
	Delete(ctx context.Context, id int) error
	GetActiveTemplates(ctx context.Context) ([]schemas.TransactionTemplateSchema, error)
	IncrementInstallment(ctx context.Context, id int) error
}

// TransactionTemplateService handles business logic for transaction templates
type TransactionTemplateService struct {
	store         TransactionTemplateStore
	accountStore  AccountStore
	categoryStore CategoryStore
}

// NewTransactionTemplateService creates a new transaction template service instance
func NewTransactionTemplateService(
	store TransactionTemplateStore,
	accountStore AccountStore,
	categoryStore CategoryStore,
) *TransactionTemplateService {
	return &TransactionTemplateService{
		store:         store,
		accountStore:  accountStore,
		categoryStore: categoryStore,
	}
}

// List retrieves paginated transaction templates with validation
func (s *TransactionTemplateService) List(ctx context.Context, params schemas.SearchParamTransactionTemplateSchema) (*schemas.PaginatedTransactionTemplateSchema, error) {
	// Validate pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 10
	}
	if params.Limit > 100 {
		params.Limit = 100
	}

	return s.store.List(ctx, params)
}

// Get retrieves a single transaction template by ID
func (s *TransactionTemplateService) Get(ctx context.Context, id int) (*schemas.TransactionTemplateSchema, error) {
	template, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if template == nil {
		return nil, repositories.ErrTransactionTemplateNotFound
	}
	return template, nil
}

// Create creates a new transaction template with validation
func (s *TransactionTemplateService) Create(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	// Validate input
	if err := input.Validate(); err != nil {
		return nil, err
	}

	// Validate account exists
	account, err := s.accountStore.Get(ctx, input.AccountID)
	if err != nil {
		return nil, err
	}

	// Validate category exists
	category, err := s.categoryStore.Get(ctx, input.CategoryID)
	if err != nil {
		return nil, err
	}

	// Validate transaction type matches category type
	if input.Type != category.Type {
		return nil, repositories.ErrTransactionTypeCategoryMismatch
	}

	// Validate account type for expense transactions
	if input.Type == repositories.TransactionExpenseType {
		if account.Type != repositories.AccountExpenseType && account.Type != repositories.AccountIncomeType {
			return nil, repositories.ErrInvalidAccountTypeForExpense
		}
	}

	// Sanitize string fields
	if input.Description != nil {
		sanitized := utils.SanitizeString(*input.Description)
		input.Description = &sanitized
	}
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	return s.store.Create(ctx, input)
}

// Update updates an existing transaction template
func (s *TransactionTemplateService) Update(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	// Check if any fields to update
	if !input.HasChanges() {
		return nil, repositories.ErrNoFieldsToUpdate
	}

	// Get existing template to check current values
	existingTemplate, err := s.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if existingTemplate == nil {
		return nil, repositories.ErrTransactionTemplateNotFound
	}

	// Validate if type is being updated
	if input.Type != nil {
		if *input.Type != "income" && *input.Type != "expense" && *input.Type != "transfer" {
			return nil, schemas.ErrTransactionTemplateInvalidType
		}
	}

	// Validate if recurrence is being updated
	if input.Recurrence != nil {
		if *input.Recurrence != "none" && *input.Recurrence != "daily" && *input.Recurrence != "weekly" && *input.Recurrence != "monthly" && *input.Recurrence != "yearly" {
			return nil, schemas.ErrTransactionTemplateInvalidRecurrence
		}
	}

	// Validate if amount is being updated
	if input.Amount != nil && *input.Amount <= 0 {
		return nil, schemas.ErrTransactionTemplateAmountRequired
	}

	// Validate if installment count is being updated
	if input.InstallmentCount != nil && *input.InstallmentCount <= 0 {
		return nil, schemas.ErrTransactionTemplateInstallmentInvalid
	}

	// Determine final values for validation
	finalAccountID := existingTemplate.AccountID
	if input.AccountID != nil {
		finalAccountID = *input.AccountID
	}

	finalCategoryID := existingTemplate.CategoryID
	if input.CategoryID != nil {
		finalCategoryID = *input.CategoryID
	}

	finalType := existingTemplate.Type
	if input.Type != nil {
		finalType = *input.Type
	}

	// Validate account and category concurrently if account, category, or type are being updated
	if input.AccountID != nil || input.CategoryID != nil || input.Type != nil {
		type accountResult struct {
			account schemas.AccountSchema
			err     error
		}
		type categoryResult struct {
			category schemas.CategorySchema
			err      error
		}

		accountCh := make(chan accountResult, 1)
		categoryCh := make(chan categoryResult, 1)

		// Validate account exists (concurrent)
		go func() {
			account, err := s.accountStore.Get(ctx, finalAccountID)
			if err != nil {
				accountCh <- accountResult{err: err}
				return
			}
			accountCh <- accountResult{account: account}
		}()

		// Validate category exists (concurrent)
		go func() {
			category, err := s.categoryStore.Get(ctx, finalCategoryID)
			if err != nil {
				categoryCh <- categoryResult{err: err}
				return
			}
			categoryCh <- categoryResult{category: category}
		}()

		// Wait for results
		accountRes := <-accountCh
		categoryRes := <-categoryCh

		// Check for errors
		if accountRes.err != nil {
			return nil, accountRes.err
		}
		if categoryRes.err != nil {
			return nil, categoryRes.err
		}

		// Validate transaction type matches category type
		if finalType != categoryRes.category.Type {
			return nil, repositories.ErrTransactionTypeCategoryMismatch
		}

		// Validate account type for expense transactions
		if finalType == repositories.TransactionExpenseType {
			if accountRes.account.Type != repositories.AccountExpenseType && accountRes.account.Type != repositories.AccountIncomeType {
				return nil, repositories.ErrInvalidAccountTypeForExpense
			}
		}
	}

	// Sanitize string fields
	if input.Description != nil {
		sanitized := utils.SanitizeString(*input.Description)
		input.Description = &sanitized
	}
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	template, err := s.store.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}
	if template == nil {
		return nil, repositories.ErrTransactionTemplateNotFound
	}
	return template, nil
}

// Delete soft deletes a transaction template
func (s *TransactionTemplateService) Delete(ctx context.Context, id int) error {
	// Check if exists
	template, err := s.store.Get(ctx, id)
	if err != nil {
		return err
	}
	if template == nil {
		return repositories.ErrTransactionTemplateNotFound
	}

	return s.store.Delete(ctx, id)
}

// GetActiveTemplates retrieves templates that should generate transactions
func (s *TransactionTemplateService) GetActiveTemplates(ctx context.Context) ([]schemas.TransactionTemplateSchema, error) {
	return s.store.GetActiveTemplates(ctx)
}

// IncrementInstallment increments the installment counter
func (s *TransactionTemplateService) IncrementInstallment(ctx context.Context, id int) error {
	return s.store.IncrementInstallment(ctx, id)
}
