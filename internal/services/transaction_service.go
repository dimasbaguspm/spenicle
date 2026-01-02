package services

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type TransactionStore interface {
	List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error)
	Get(ctx context.Context, id int) (schemas.TransactionSchema, error)
	Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error)
	Delete(ctx context.Context, id int) error
	UpdateAccountBalance(ctx context.Context, accountID int, deltaAmount int) error
}

type TransactionService struct {
	transactionStore TransactionStore
	accountStore     AccountStore
	categoryStore    CategoryStore
}

func NewTransactionService(
	transactionStore TransactionStore,
	accountStore AccountStore,
	categoryStore CategoryStore,
) *TransactionService {
	return &TransactionService{
		transactionStore: transactionStore,
		accountStore:     accountStore,
		categoryStore:    categoryStore,
	}
}

// List returns paginated transactions.
func (s *TransactionService) List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
	return s.transactionStore.List(ctx, params)
}

// Get retrieves a transaction by ID.
func (s *TransactionService) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
	return s.transactionStore.Get(ctx, id)
}

// Create creates a new transaction with validation.
// Validates:
// - Transaction type matches category type
// - Account exists and is not deleted
// - Category exists and is not deleted
// - For expense transactions: account type must be 'expense' or 'income'
// Updates account balance after successful creation.
// Uses goroutines to fetch account and category concurrently for better performance.
func (s *TransactionService) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	// Sanitize note
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	// Fetch account and category concurrently
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
		account, err := s.accountStore.Get(ctx, int64(input.AccountID))
		if err != nil {
			accountCh <- accountResult{err: err}
			return
		}
		accountCh <- accountResult{account: account}
	}()

	// Validate category exists (concurrent)
	go func() {
		category, err := s.categoryStore.Get(ctx, int64(input.CategoryID))
		if err != nil {
			categoryCh <- categoryResult{err: err}
			return
		}
		categoryCh <- categoryResult{category: category}
	}()

	// Wait for both results
	accountRes := <-accountCh
	categoryRes := <-categoryCh

	// Check for errors (early return on first error)
	if accountRes.err != nil {
		return schemas.TransactionSchema{}, accountRes.err
	}
	if categoryRes.err != nil {
		return schemas.TransactionSchema{}, categoryRes.err
	}

	// Validate transaction type matches category type
	if input.Type != categoryRes.category.Type {
		return schemas.TransactionSchema{}, repositories.ErrTransactionTypeCategoryMismatch
	}

	// Validate account type for expense transactions
	// Expense transactions can use either 'expense' or 'income' accounts
	if input.Type == repositories.TransactionExpenseType {
		if accountRes.account.Type != repositories.AccountExpenseType && accountRes.account.Type != repositories.AccountIncomeType {
			return schemas.TransactionSchema{}, repositories.ErrInvalidAccountTypeForExpense
		}
	}

	// Create transaction
	transaction, err := s.transactionStore.Create(ctx, input)
	if err != nil {
		return schemas.TransactionSchema{}, err
	}

	// Update account balance based on transaction type
	deltaAmount := s.calculateDeltaAmount(input.Type, input.Amount)
	if err := s.transactionStore.UpdateAccountBalance(ctx, input.AccountID, deltaAmount); err != nil {
		// Note: In production, this should be wrapped in a database transaction
		return schemas.TransactionSchema{}, fmt.Errorf("update account balance: %w", err)
	}

	return transaction, nil
}

// Update updates a transaction with validation.
// If amount or account changes, synchronizes account balances.
// Uses goroutines to fetch account and category concurrently when both are being updated.
func (s *TransactionService) Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
	if !input.HasChanges() {
		return schemas.TransactionSchema{}, repositories.ErrNoFieldsToUpdate
	}

	// Sanitize note
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	// Get existing transaction
	existing, err := s.transactionStore.Get(ctx, id)
	if err != nil {
		return schemas.TransactionSchema{}, err
	}

	// Determine what needs to be validated
	needAccountValidation := input.AccountID != nil
	needCategoryValidation := input.CategoryID != nil || input.Type != nil

	var account schemas.AccountSchema
	var category schemas.CategorySchema

	// If both account and category need validation, fetch concurrently
	if needAccountValidation && needCategoryValidation {
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

		// Fetch account concurrently
		go func() {
			acc, err := s.accountStore.Get(ctx, int64(*input.AccountID))
			accountCh <- accountResult{account: acc, err: err}
		}()

		// Fetch category concurrently
		go func() {
			categoryID := existing.CategoryID
			if input.CategoryID != nil {
				categoryID = *input.CategoryID
			}
			cat, err := s.categoryStore.Get(ctx, int64(categoryID))
			categoryCh <- categoryResult{category: cat, err: err}
		}()

		// Wait for both results
		accountRes := <-accountCh
		categoryRes := <-categoryCh

		// Early return on errors
		if accountRes.err != nil {
			return schemas.TransactionSchema{}, accountRes.err
		}
		if categoryRes.err != nil {
			return schemas.TransactionSchema{}, categoryRes.err
		}

		account = accountRes.account
		category = categoryRes.category
	} else {
		// Sequential validation if only one or neither needs validation
		if needAccountValidation {
			acc, err := s.accountStore.Get(ctx, int64(*input.AccountID))
			if err != nil {
				return schemas.TransactionSchema{}, err
			}
			account = acc
		}

		if needCategoryValidation {
			categoryID := existing.CategoryID
			if input.CategoryID != nil {
				categoryID = *input.CategoryID
			}
			cat, err := s.categoryStore.Get(ctx, int64(categoryID))
			if err != nil {
				return schemas.TransactionSchema{}, err
			}
			category = cat
		}
	}

	// Validate account type for expense transactions if account was validated
	if needAccountValidation {
		transactionType := existing.Type
		if input.Type != nil {
			transactionType = *input.Type
		}
		if transactionType == repositories.TransactionExpenseType {
			if account.Type != repositories.AccountExpenseType && account.Type != repositories.AccountIncomeType {
				return schemas.TransactionSchema{}, repositories.ErrInvalidAccountTypeForExpense
			}
		}
	}

	// Validate type matches category type if category was validated
	if needCategoryValidation {
		transactionType := existing.Type
		if input.Type != nil {
			transactionType = *input.Type
		}
		if transactionType != category.Type {
			return schemas.TransactionSchema{}, repositories.ErrTransactionTypeCategoryMismatch
		}
	}

	// Sync account balance if amount or account changed
	newAccountID := existing.AccountID
	if input.AccountID != nil {
		newAccountID = *input.AccountID
	}

	if input.Amount != nil || input.AccountID != nil {
		// Revert old transaction effect on old account
		oldDelta := s.calculateDeltaAmount(existing.Type, existing.Amount)
		if err := s.transactionStore.UpdateAccountBalance(ctx, existing.AccountID, -oldDelta); err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("revert old account balance: %w", err)
		}

		// Apply new transaction effect on new account
		newAmount := existing.Amount
		if input.Amount != nil {
			newAmount = *input.Amount
		}
		newType := existing.Type
		if input.Type != nil {
			newType = *input.Type
		}
		newDelta := s.calculateDeltaAmount(newType, newAmount)
		if err := s.transactionStore.UpdateAccountBalance(ctx, newAccountID, newDelta); err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("update new account balance: %w", err)
		}
	}

	// Update transaction
	return s.transactionStore.Update(ctx, id, input)
}

// Delete soft-deletes a transaction and reverts its effect on account balance.
func (s *TransactionService) Delete(ctx context.Context, id int) error {
	// Get existing transaction to revert balance
	existing, err := s.transactionStore.Get(ctx, id)
	if err != nil {
		return err
	}

	// Revert transaction effect on account balance
	delta := s.calculateDeltaAmount(existing.Type, existing.Amount)
	if err := s.transactionStore.UpdateAccountBalance(ctx, existing.AccountID, -delta); err != nil {
		return fmt.Errorf("revert account balance: %w", err)
	}

	return s.transactionStore.Delete(ctx, id)
}

// calculateDeltaAmount calculates the delta to apply to account balance.
// Income adds to balance, expense subtracts from balance.
// Transfer is handled separately (not in scope for this basic implementation).
func (s *TransactionService) calculateDeltaAmount(transactionType string, amount int) int {
	switch transactionType {
	case repositories.TransactionIncomeType:
		return amount
	case repositories.TransactionExpenseType:
		return -amount
	case repositories.TransactionTransferType:
		// Transfer logic would need special handling (two accounts involved)
		return 0
	default:
		return 0
	}
}
