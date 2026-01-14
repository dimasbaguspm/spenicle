package services

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionService struct {
	tr repositories.TransactionRepository
}

func NewTransactionService(tr repositories.TransactionRepository) TransactionService {
	return TransactionService{tr}
}

func (ts TransactionService) List(ctx context.Context, p models.ListTransactionsRequestModel) (models.ListTransactionsResponseModel, error) {
	return ts.tr.List(ctx, p)
}

func (ts TransactionService) Get(ctx context.Context, id int64) (models.TransactionModel, error) {
	return ts.tr.Get(ctx, id)
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionRequestModel) (models.CreateTransactionResponseModel, error) {
	// Create the transaction
	resp, err := ts.tr.Create(ctx, p)
	if err != nil {
		return models.CreateTransactionResponseModel{}, err
	}

	// Update account balances based on transaction type
	if p.Type == "transfer" {
		// Transfer: deduct from source, add to destination
		if p.DestinationAccountID != nil {
			if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, -p.Amount); err != nil {
				return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update source account balance: %w", err)
			}
			if err := ts.tr.UpdateAccountBalance(ctx, *p.DestinationAccountID, p.Amount); err != nil {
				return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update destination account balance: %w", err)
			}
		}
	} else if p.Type == "income" {
		// Income: add to account
		if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, p.Amount); err != nil {
			return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
		}
	} else if p.Type == "expense" {
		// Expense: subtract from account
		if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, -p.Amount); err != nil {
			return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
		}
	}

	// Fetch complete transaction with account/category details
	return models.CreateTransactionResponseModel{
		TransactionModel: resp.TransactionModel,
	}, nil
}

func (ts TransactionService) Update(ctx context.Context, id int64, p models.UpdateTransactionRequestModel) (models.UpdateTransactionResponseModel, error) {
	// Get existing transaction to determine balance reversions
	existing, err := ts.tr.GetTransactionWithAccounts(ctx, id)
	if err != nil {
		return models.UpdateTransactionResponseModel{}, err
	}

	// Revert old transaction's balance effects
	if existing.Type == "transfer" && existing.DestinationAccount != nil {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, existing.Amount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to revert source account balance: %w", err)
		}
		if err := ts.tr.UpdateAccountBalance(ctx, existing.DestinationAccount.ID, -existing.Amount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to revert destination account balance: %w", err)
		}
	} else if existing.Type == "income" {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, -existing.Amount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to revert account balance: %w", err)
		}
	} else if existing.Type == "expense" {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, existing.Amount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to revert account balance: %w", err)
		}
	}

	// Update the transaction
	resp, err := ts.tr.Update(ctx, id, p)
	if err != nil {
		return models.UpdateTransactionResponseModel{}, err
	}

	// Determine new amount and accounts (Type cannot be changed)
	newType := existing.Type
	newAmount := existing.Amount
	if p.Amount != nil {
		newAmount = *p.Amount
	}
	newAccountID := existing.Account.ID
	if p.AccountID != nil {
		newAccountID = *p.AccountID
	}
	newDestAccountID := existing.DestinationAccount
	if p.DestinationAccountID != nil && *p.DestinationAccountID != 0 {
		newDestAccountID = &models.TransactionAccountEmbedded{ID: *p.DestinationAccountID}
	}

	// Apply new transaction's balance effects
	if newType == "transfer" {
		if newDestAccountID != nil {
			if err := ts.tr.UpdateAccountBalance(ctx, newAccountID, -newAmount); err != nil {
				return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to update source account balance: %w", err)
			}
			if err := ts.tr.UpdateAccountBalance(ctx, newDestAccountID.ID, newAmount); err != nil {
				return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to update destination account balance: %w", err)
			}
		}
	} else if newType == "income" {
		if err := ts.tr.UpdateAccountBalance(ctx, newAccountID, newAmount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
		}
	} else if newType == "expense" {
		if err := ts.tr.UpdateAccountBalance(ctx, newAccountID, -newAmount); err != nil {
			return models.UpdateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
		}
	}

	return resp, nil
}

func (ts TransactionService) Delete(ctx context.Context, id int64) error {
	// Get existing transaction to revert balance effects
	existing, err := ts.tr.GetTransactionWithAccounts(ctx, id)
	if err != nil {
		return err
	}

	// Revert transaction's balance effects before deleting
	if existing.Type == "transfer" && existing.DestinationAccount != nil {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, existing.Amount); err != nil {
			return fmt.Errorf("failed to revert source account balance: %w", err)
		}
		if err := ts.tr.UpdateAccountBalance(ctx, existing.DestinationAccount.ID, -existing.Amount); err != nil {
			return fmt.Errorf("failed to revert destination account balance: %w", err)
		}
	} else if existing.Type == "income" {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, -existing.Amount); err != nil {
			return fmt.Errorf("failed to revert account balance: %w", err)
		}
	} else if existing.Type == "expense" {
		if err := ts.tr.UpdateAccountBalance(ctx, existing.Account.ID, existing.Amount); err != nil {
			return fmt.Errorf("failed to revert account balance: %w", err)
		}
	}

	// Delete the transaction
	return ts.tr.Delete(ctx, id)
}
