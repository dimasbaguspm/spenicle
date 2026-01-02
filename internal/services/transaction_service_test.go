package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// Mock implementations
type mockTransactionStore struct {
	listFunc                 func(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error)
	getFunc                  func(ctx context.Context, id int) (schemas.TransactionSchema, error)
	createFunc               func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error)
	updateFunc               func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error)
	deleteFunc               func(ctx context.Context, id int) error
	updateAccountBalanceFunc func(ctx context.Context, accountID int, deltaAmount int) error
	createTransferFunc       func(ctx context.Context, input schemas.CreateTransactionSchema, sourceAccountID, destinationAccountID int) (schemas.TransactionSchema, error)
	updateTransferFunc       func(ctx context.Context, id int, oldTransaction schemas.TransactionSchema, input schemas.UpdateTransactionSchema, newSourceAccountID, newDestinationAccountID int) (schemas.TransactionSchema, error)
	deleteTransferFunc       func(ctx context.Context, transaction schemas.TransactionSchema) error
}

func (m *mockTransactionStore) List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
	return m.listFunc(ctx, params)
}

func (m *mockTransactionStore) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
	return m.getFunc(ctx, id)
}

func (m *mockTransactionStore) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	return m.createFunc(ctx, input)
}

func (m *mockTransactionStore) Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
	return m.updateFunc(ctx, id, input)
}

func (m *mockTransactionStore) Delete(ctx context.Context, id int) error {
	return m.deleteFunc(ctx, id)
}

func (m *mockTransactionStore) UpdateAccountBalance(ctx context.Context, accountID int, deltaAmount int) error {
	return m.updateAccountBalanceFunc(ctx, accountID, deltaAmount)
}

func (m *mockTransactionStore) CreateTransfer(ctx context.Context, input schemas.CreateTransactionSchema, sourceAccountID, destinationAccountID int) (schemas.TransactionSchema, error) {
	if m.createTransferFunc != nil {
		return m.createTransferFunc(ctx, input, sourceAccountID, destinationAccountID)
	}
	// Default implementation for non-transfer tests
	return m.createFunc(ctx, input)
}

func (m *mockTransactionStore) UpdateTransfer(ctx context.Context, id int, oldTransaction schemas.TransactionSchema, input schemas.UpdateTransactionSchema, newSourceAccountID, newDestinationAccountID int) (schemas.TransactionSchema, error) {
	if m.updateTransferFunc != nil {
		return m.updateTransferFunc(ctx, id, oldTransaction, input, newSourceAccountID, newDestinationAccountID)
	}
	// Default implementation for non-transfer tests
	return m.updateFunc(ctx, id, input)
}

func (m *mockTransactionStore) DeleteTransfer(ctx context.Context, transaction schemas.TransactionSchema) error {
	if m.deleteTransferFunc != nil {
		return m.deleteTransferFunc(ctx, transaction)
	}
	// Default implementation for non-transfer tests
	return m.deleteFunc(ctx, transaction.ID)
}

type mockAccountStore struct {
	getFunc func(ctx context.Context, id int64) (schemas.AccountSchema, error)
}

func (m *mockAccountStore) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, id)
	}
	return schemas.AccountSchema{}, nil
}

func (m *mockAccountStore) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
	return schemas.PaginatedAccountSchema{}, nil
}

func (m *mockAccountStore) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	return schemas.AccountSchema{}, nil
}

func (m *mockAccountStore) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	return schemas.AccountSchema{}, nil
}

func (m *mockAccountStore) Delete(ctx context.Context, id int64) error {
	return nil
}

type mockCategoryStore struct {
	getFunc func(ctx context.Context, id int64) (schemas.CategorySchema, error)
}

func (m *mockCategoryStore) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, id)
	}
	return schemas.CategorySchema{}, nil
}

func (m *mockCategoryStore) List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
	return schemas.PaginatedCategorySchema{}, nil
}

func (m *mockCategoryStore) Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	return schemas.CategorySchema{}, nil
}

func (m *mockCategoryStore) Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	return schemas.CategorySchema{}, nil
}

func (m *mockCategoryStore) Delete(ctx context.Context, id int64) error {
	return nil
}

func TestTransactionServiceCreate(t *testing.T) {
	ctx := context.Background()

	t.Run("successfully creates transaction", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{
			createFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       input.Type,
					Date:       now,
					Amount:     input.Amount,
					AccountID:  input.AccountID,
					CategoryID: input.CategoryID,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
			updateAccountBalanceFunc: func(ctx context.Context, accountID int, deltaAmount int) error {
				if deltaAmount != -50000 {
					t.Errorf("expected delta -50000, got %d", deltaAmount)
				}
				return nil
			},
		}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{
					ID:   1,
					Type: repositories.AccountExpenseType,
				}, nil
			},
		}

		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{
					ID:   1,
					Type: repositories.CategoryTypeExpense,
				}, nil
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionExpenseType,
			Date:       &now,
			Amount:     50000,
			AccountID:  1,
			CategoryID: 1,
		}

		transaction, err := service.Create(ctx, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.ID != 1 {
			t.Errorf("expected ID 1, got %d", transaction.ID)
		}
	})

	t.Run("successfully creates income transaction", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{
			createFunc: func(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         2,
					Type:       input.Type,
					Date:       now,
					Amount:     input.Amount,
					AccountID:  input.AccountID,
					CategoryID: input.CategoryID,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
			updateAccountBalanceFunc: func(ctx context.Context, accountID int, deltaAmount int) error {
				if deltaAmount != 100000 {
					t.Errorf("expected delta 100000, got %d", deltaAmount)
				}
				return nil
			},
		}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{
					ID:   2,
					Type: repositories.AccountIncomeType,
				}, nil
			},
		}

		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{
					ID:   2,
					Type: repositories.CategoryTypeIncome,
				}, nil
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionIncomeType,
			Date:       &now,
			Amount:     100000,
			AccountID:  2,
			CategoryID: 2,
		}

		transaction, err := service.Create(ctx, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.ID != 2 {
			t.Errorf("expected ID 2, got %d", transaction.ID)
		}
	})

	t.Run("fails when transaction type doesn't match category type", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{
					ID:   1,
					Type: repositories.AccountIncomeType,
				}, nil
			},
		}

		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{
					ID:   1,
					Type: repositories.CategoryTypeIncome,
				}, nil
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionExpenseType,
			Date:       &now,
			Amount:     50000,
			AccountID:  1,
			CategoryID: 1,
		}

		_, err := service.Create(ctx, input)
		if !errors.Is(err, repositories.ErrTransactionTypeCategoryMismatch) {
			t.Errorf("expected ErrTransactionTypeCategoryMismatch, got %v", err)
		}
	})

	t.Run("fails when account not found", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{}, repositories.ErrAccountNotFound
			},
		}

		categoryStore := &mockCategoryStore{}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionExpenseType,
			Date:       &now,
			Amount:     50000,
			AccountID:  999,
			CategoryID: 1,
		}

		_, err := service.Create(ctx, input)
		if err == nil || err.Error() != "account not found" {
			t.Errorf("expected 'account not found' error, got %v", err)
		}
	})

	t.Run("fails when category not found", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{
					ID:   1,
					Type: repositories.AccountExpenseType,
				}, nil
			},
		}

		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{}, repositories.ErrCategoryNotFound
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionExpenseType,
			Date:       &now,
			Amount:     50000,
			AccountID:  1,
			CategoryID: 999,
		}

		_, err := service.Create(ctx, input)
		if err == nil || err.Error() != "category not found" {
			t.Errorf("expected 'category not found' error, got %v", err)
		}
	})

	t.Run("fails when expense transaction uses invalid account type", func(t *testing.T) {
		now := time.Now()
		transactionStore := &mockTransactionStore{}

		accountStore := &mockAccountStore{
			getFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
				return schemas.AccountSchema{
					ID:   1,
					Type: "savings",
				}, nil
			},
		}

		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{
					ID:   1,
					Type: repositories.CategoryTypeExpense,
				}, nil
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.CreateTransactionSchema{
			Type:       repositories.TransactionExpenseType,
			Date:       &now,
			Amount:     50000,
			AccountID:  1,
			CategoryID: 1,
		}

		_, err := service.Create(ctx, input)
		if !errors.Is(err, repositories.ErrInvalidAccountTypeForExpense) {
			t.Errorf("expected ErrInvalidAccountTypeForExpense, got %v", err)
		}
	})
}

func TestTransactionServiceUpdate(t *testing.T) {
	ctx := context.Background()

	t.Run("fails when no fields to update", func(t *testing.T) {
		transactionStore := &mockTransactionStore{}
		accountStore := &mockAccountStore{}
		categoryStore := &mockCategoryStore{}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.UpdateTransactionSchema{}

		_, err := service.Update(ctx, 1, input)
		if !errors.Is(err, repositories.ErrNoFieldsToUpdate) {
			t.Errorf("expected ErrNoFieldsToUpdate, got %v", err)
		}
	})

	t.Run("successfully updates transaction amount", func(t *testing.T) {
		now := time.Now()
		amount := 75000

		transactionStore := &mockTransactionStore{
			getFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     50000,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
			updateFunc: func(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     *input.Amount,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
			updateAccountBalanceFunc: func(ctx context.Context, accountID int, deltaAmount int) error {
				return nil
			},
		}

		accountStore := &mockAccountStore{}
		categoryStore := &mockCategoryStore{}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.UpdateTransactionSchema{
			Amount: &amount,
		}

		transaction, err := service.Update(ctx, 1, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if transaction.Amount != 75000 {
			t.Errorf("expected amount 75000, got %d", transaction.Amount)
		}
	})

	t.Run("fails when updating with type-category mismatch", func(t *testing.T) {
		now := time.Now()
		newType := repositories.TransactionIncomeType

		transactionStore := &mockTransactionStore{
			getFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     50000,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
		}

		accountStore := &mockAccountStore{}
		categoryStore := &mockCategoryStore{
			getFunc: func(ctx context.Context, id int64) (schemas.CategorySchema, error) {
				return schemas.CategorySchema{
					ID:   1,
					Type: repositories.CategoryTypeExpense,
				}, nil
			},
		}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		input := schemas.UpdateTransactionSchema{
			Type: &newType,
		}

		_, err := service.Update(ctx, 1, input)
		if !errors.Is(err, repositories.ErrTransactionTypeCategoryMismatch) {
			t.Errorf("expected ErrTransactionTypeCategoryMismatch, got %v", err)
		}
	})
}

func TestTransactionServiceDelete(t *testing.T) {
	ctx := context.Background()

	t.Run("successfully deletes transaction", func(t *testing.T) {
		now := time.Now()

		transactionStore := &mockTransactionStore{
			getFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{
					ID:         1,
					Type:       repositories.TransactionExpenseType,
					Date:       now,
					Amount:     50000,
					AccountID:  1,
					CategoryID: 1,
					CreatedAt:  now,
					UpdatedAt:  now,
				}, nil
			},
			deleteFunc: func(ctx context.Context, id int) error {
				return nil
			},
			updateAccountBalanceFunc: func(ctx context.Context, accountID int, deltaAmount int) error {
				if deltaAmount != 50000 {
					t.Errorf("expected delta 50000 (revert), got %d", deltaAmount)
				}
				return nil
			},
		}

		accountStore := &mockAccountStore{}
		categoryStore := &mockCategoryStore{}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		err := service.Delete(ctx, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("fails when transaction not found", func(t *testing.T) {
		transactionStore := &mockTransactionStore{
			getFunc: func(ctx context.Context, id int) (schemas.TransactionSchema, error) {
				return schemas.TransactionSchema{}, repositories.ErrTransactionNotFound
			},
		}

		accountStore := &mockAccountStore{}
		categoryStore := &mockCategoryStore{}

		service := NewTransactionService(transactionStore, accountStore, categoryStore)

		err := service.Delete(ctx, 999)
		if !errors.Is(err, repositories.ErrTransactionNotFound) {
			t.Errorf("expected ErrTransactionNotFound, got %v", err)
		}
	})
}

func TestCalculateDeltaAmount(t *testing.T) {
	transactionStore := &mockTransactionStore{}
	accountStore := &mockAccountStore{}
	categoryStore := &mockCategoryStore{}

	service := NewTransactionService(transactionStore, accountStore, categoryStore)

	t.Run("income adds to balance", func(t *testing.T) {
		delta := service.calculateDeltaAmount(repositories.TransactionIncomeType, 50000)
		if delta != 50000 {
			t.Errorf("expected delta 50000, got %d", delta)
		}
	})

	t.Run("expense subtracts from balance", func(t *testing.T) {
		delta := service.calculateDeltaAmount(repositories.TransactionExpenseType, 50000)
		if delta != -50000 {
			t.Errorf("expected delta -50000, got %d", delta)
		}
	})

	t.Run("transfer returns 0", func(t *testing.T) {
		delta := service.calculateDeltaAmount(repositories.TransactionTransferType, 50000)
		if delta != 0 {
			t.Errorf("expected delta 0, got %d", delta)
		}
	})
}
