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
	CreateTransfer(ctx context.Context, input schemas.CreateTransactionSchema, sourceAccountID, destinationAccountID int) (schemas.TransactionSchema, error)
	UpdateTransfer(ctx context.Context, id int, oldTransaction schemas.TransactionSchema, input schemas.UpdateTransactionSchema, newSourceAccountID, newDestinationAccountID int) (schemas.TransactionSchema, error)
	DeleteTransfer(ctx context.Context, transaction schemas.TransactionSchema) error
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
// - For transfer transactions: destination account is required and exists
// Updates account balance after successful creation.
// For transfer transactions, deducts from source account and adds to destination account.
// Uses goroutines to fetch account and category concurrently for better performance.
func (s *TransactionService) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	// Sanitize note
	if input.Note != nil {
		sanitized := utils.SanitizeString(*input.Note)
		input.Note = &sanitized
	}

	// Validate destinationAccountId based on transaction type
	if input.Type == repositories.TransactionTransferType {
		// Transfer requires destination account
		if input.DestinationAccountID == nil {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
		if input.AccountID == *input.DestinationAccountID {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
	} else {
		// Income/Expense should not have destination account
		if input.DestinationAccountID != nil {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
	}

	// Fetch account, destination account (if transfer), and category concurrently
	type accountResult struct {
		account schemas.AccountSchema
		err     error
	}
	type categoryResult struct {
		category schemas.CategorySchema
		err      error
	}

	accountCh := make(chan accountResult, 1)
	destAccountCh := make(chan accountResult, 1)
	categoryCh := make(chan categoryResult, 1)

	// Validate source account exists (concurrent)
	go func() {
		account, err := s.accountStore.Get(ctx, int64(input.AccountID))
		if err != nil {
			accountCh <- accountResult{err: err}
			return
		}
		accountCh <- accountResult{account: account}
	}()

	// Validate destination account exists for transfer (concurrent)
	if input.Type == repositories.TransactionTransferType && input.DestinationAccountID != nil {
		go func() {
			destAccount, err := s.accountStore.Get(ctx, int64(*input.DestinationAccountID))
			if err != nil {
				destAccountCh <- accountResult{err: err}
				return
			}
			destAccountCh <- accountResult{account: destAccount}
		}()
	}

	// Validate category exists (concurrent)
	go func() {
		category, err := s.categoryStore.Get(ctx, int64(input.CategoryID))
		if err != nil {
			categoryCh <- categoryResult{err: err}
			return
		}
		categoryCh <- categoryResult{category: category}
	}()

	// Wait for results
	accountRes := <-accountCh
	categoryRes := <-categoryCh

	var destAccountRes accountResult
	if input.Type == repositories.TransactionTransferType && input.DestinationAccountID != nil {
		destAccountRes = <-destAccountCh
	}

	// Check for errors (early return on first error)
	if accountRes.err != nil {
		return schemas.TransactionSchema{}, accountRes.err
	}
	if categoryRes.err != nil {
		return schemas.TransactionSchema{}, categoryRes.err
	}
	if input.Type == repositories.TransactionTransferType && destAccountRes.err != nil {
		return schemas.TransactionSchema{}, destAccountRes.err
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

	// For transfer transactions, use atomic repository method
	if input.Type == repositories.TransactionTransferType {
		return s.transactionStore.CreateTransfer(ctx, input, input.AccountID, *input.DestinationAccountID)
	}

	// Create transaction (for income/expense)
	transaction, err := s.transactionStore.Create(ctx, input)
	if err != nil {
		return schemas.TransactionSchema{}, err
	}

	// Update account balance using standard delta calculation
	deltaAmount := s.calculateDeltaAmount(input.Type, input.Amount)
	if err := s.transactionStore.UpdateAccountBalance(ctx, input.AccountID, deltaAmount); err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("update account balance: %w", err)
	}

	return transaction, nil
}

// Update updates a transaction with validation.
// If amount, account, or destination account changes, synchronizes account balances.
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

	// Determine final transaction type
	newType := existing.Type
	if input.Type != nil {
		newType = *input.Type
	}

	// Validate transfer transaction has destination account
	if newType == repositories.TransactionTransferType {
		destAccountID := existing.DestinationAccountID
		if input.DestinationAccountID != nil {
			destAccountID = input.DestinationAccountID
		}
		if destAccountID == nil {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
		sourceAccountID := existing.AccountID
		if input.AccountID != nil {
			sourceAccountID = *input.AccountID
		}
		if sourceAccountID == *destAccountID {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
	} else {
		// Income/Expense should not have destination account
		if input.DestinationAccountID != nil {
			return schemas.TransactionSchema{}, repositories.ErrInvalidTransactionData
		}
	}

	// Determine what needs to be validated
	needAccountValidation := input.AccountID != nil
	needDestAccountValidation := input.DestinationAccountID != nil
	needCategoryValidation := input.CategoryID != nil || input.Type != nil

	var account schemas.AccountSchema
	var category schemas.CategorySchema

	// Concurrent validation if multiple resources need checking
	if (needAccountValidation || needDestAccountValidation) && needCategoryValidation {
		type accountResult struct {
			account schemas.AccountSchema
			err     error
		}
		type categoryResult struct {
			category schemas.CategorySchema
			err      error
		}

		accountCh := make(chan accountResult, 1)
		destAccountCh := make(chan accountResult, 1)
		categoryCh := make(chan categoryResult, 1)

		// Fetch source account if changed
		if needAccountValidation {
			go func() {
				acc, err := s.accountStore.Get(ctx, int64(*input.AccountID))
				accountCh <- accountResult{account: acc, err: err}
			}()
		}

		// Fetch destination account if changed
		if needDestAccountValidation {
			go func() {
				_, err := s.accountStore.Get(ctx, int64(*input.DestinationAccountID))
				destAccountCh <- accountResult{account: schemas.AccountSchema{}, err: err}
			}()
		}

		// Fetch category concurrently
		go func() {
			categoryID := existing.CategoryID
			if input.CategoryID != nil {
				categoryID = *input.CategoryID
			}
			cat, err := s.categoryStore.Get(ctx, int64(categoryID))
			categoryCh <- categoryResult{category: cat, err: err}
		}()

		// Wait for results
		if needAccountValidation {
			accountRes := <-accountCh
			if accountRes.err != nil {
				return schemas.TransactionSchema{}, accountRes.err
			}
			account = accountRes.account
		}

		if needDestAccountValidation {
			destAccountRes := <-destAccountCh
			if destAccountRes.err != nil {
				return schemas.TransactionSchema{}, destAccountRes.err
			}
		}

		categoryRes := <-categoryCh
		if categoryRes.err != nil {
			return schemas.TransactionSchema{}, categoryRes.err
		}
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

		if needDestAccountValidation {
			_, err := s.accountStore.Get(ctx, int64(*input.DestinationAccountID))
			if err != nil {
				return schemas.TransactionSchema{}, err
			}
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
		if newType == repositories.TransactionExpenseType {
			if account.Type != repositories.AccountExpenseType && account.Type != repositories.AccountIncomeType {
				return schemas.TransactionSchema{}, repositories.ErrInvalidAccountTypeForExpense
			}
		}
	}

	// Validate type matches category type if category was validated
	if needCategoryValidation {
		if newType != category.Type {
			return schemas.TransactionSchema{}, repositories.ErrTransactionTypeCategoryMismatch
		}
	}

	// Determine final values for comparison
	newAmount := existing.Amount
	if input.Amount != nil {
		newAmount = *input.Amount
	}

	newAccountID := existing.AccountID
	if input.AccountID != nil {
		newAccountID = *input.AccountID
	}

	newDestAccountID := existing.DestinationAccountID
	if input.DestinationAccountID != nil {
		newDestAccountID = input.DestinationAccountID
	}

	// For transfer transactions, use atomic repository method
	if existing.Type == repositories.TransactionTransferType && newType == repositories.TransactionTransferType {
		return s.transactionStore.UpdateTransfer(ctx, id, existing, input, newAccountID, *newDestAccountID)
	}

	// For non-transfer or type-changing updates, handle balance updates manually
	// Revert old transaction effects
	if existing.Type == repositories.TransactionTransferType {
		// Revert transfer: add back to source, subtract from destination
		if existing.DestinationAccountID != nil {
			if err := s.transactionStore.UpdateAccountBalance(ctx, existing.AccountID, existing.Amount); err != nil {
				return schemas.TransactionSchema{}, fmt.Errorf("revert old source account balance: %w", err)
			}
			if err := s.transactionStore.UpdateAccountBalance(ctx, *existing.DestinationAccountID, -existing.Amount); err != nil {
				return schemas.TransactionSchema{}, fmt.Errorf("revert old destination account balance: %w", err)
			}
		}
	} else {
		// Revert income/expense
		oldDelta := s.calculateDeltaAmount(existing.Type, existing.Amount)
		if err := s.transactionStore.UpdateAccountBalance(ctx, existing.AccountID, -oldDelta); err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("revert old account balance: %w", err)
		}
	}

	// Update transaction record
	updated, err := s.transactionStore.Update(ctx, id, input)
	if err != nil {
		return schemas.TransactionSchema{}, err
	}

	// Apply new transaction effects
	if newType == repositories.TransactionTransferType {
		// Apply transfer: deduct from source, add to destination
		if newDestAccountID != nil {
			if err := s.transactionStore.UpdateAccountBalance(ctx, newAccountID, -newAmount); err != nil {
				return schemas.TransactionSchema{}, fmt.Errorf("update new source account balance: %w", err)
			}
			if err := s.transactionStore.UpdateAccountBalance(ctx, *newDestAccountID, newAmount); err != nil {
				return schemas.TransactionSchema{}, fmt.Errorf("update new destination account balance: %w", err)
			}
		}
	} else {
		// Apply income/expense
		newDelta := s.calculateDeltaAmount(newType, newAmount)
		if err := s.transactionStore.UpdateAccountBalance(ctx, newAccountID, newDelta); err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("update new account balance: %w", err)
		}
	}

	return updated, nil
}

// Delete soft-deletes a transaction and reverts its effect on account balance.
// For transfer transactions, uses atomic repository method to ensure consistency.
func (s *TransactionService) Delete(ctx context.Context, id int) error {
	// Get existing transaction to revert balance
	existing, err := s.transactionStore.Get(ctx, id)
	if err != nil {
		return err
	}

	// For transfer transactions, use atomic repository method
	if existing.Type == repositories.TransactionTransferType {
		return s.transactionStore.DeleteTransfer(ctx, existing)
	}

	// For income/expense transactions, revert balance and delete
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
