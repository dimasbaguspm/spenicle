package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/jackc/pgx/v5"
)

type TransactionService struct {
	tr repositories.TransactionRepository
	ar repositories.AccountRepository
}

func NewTransactionService(tr repositories.TransactionRepository, ar repositories.AccountRepository) TransactionService {
	return TransactionService{tr, ar}
}

func (ts TransactionService) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	return ts.tr.GetPaged(ctx, p)
}

func (ts TransactionService) GetDetail(ctx context.Context, id int64) (models.TransactionModel, error) {
	return ts.tr.GetDetail(ctx, id)
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {

	tx, err := ts.tr.Pgx.BeginTx(ctx, pgx.TxOptions{})

	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("Unable to start transaction")
	}
	defer tx.Rollback(ctx)

	transactionID, err := ts.tr.CreateWithTx(ctx, tx, p)
	if err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.applyBalanceChanges(ctx, tx, p.Type, p.Amount, p.AccountID, p.DestinationAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	return ts.tr.GetDetail(ctx, transactionID)
}

func (ts TransactionService) Update(ctx context.Context, id int64, p models.UpdateTransactionModel) (models.TransactionModel, error) {
	tx, err := ts.tr.Pgx.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	existing, err := ts.tr.GetDetail(ctx, id)
	if err != nil {
		return models.TransactionModel{}, err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, tx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.tr.UpdateWithTx(ctx, tx, id, p); err != nil {
		return models.TransactionModel{}, err
	}

	newType := existing.Type
	if p.Type != nil {
		newType = *p.Type
	}
	newAmount := existing.Amount
	if p.Amount != nil {
		newAmount = *p.Amount
	}
	newAccountID := existing.Account.ID
	if p.AccountID != nil {
		newAccountID = *p.AccountID
	}
	newDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		newDestAccountID = &existing.DestinationAccount.ID
	}
	if p.DestinationAccountID != nil && *p.DestinationAccountID != 0 {
		newDestAccountID = p.DestinationAccountID
	}

	if err := ts.applyBalanceChanges(ctx, tx, newType, newAmount, newAccountID, newDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	return ts.tr.GetDetail(ctx, id)
}

func (ts TransactionService) Delete(ctx context.Context, id int64) error {
	tx, err := ts.tr.Pgx.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	existing, err := ts.tr.GetDetail(ctx, id)
	if err != nil {
		return err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, tx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return err
	}

	if err := ts.tr.DeleteWithTx(ctx, tx, id); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	return nil
}

func (ts TransactionService) applyBalanceChanges(ctx context.Context, tx pgx.Tx, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update source account balance")
			}
			if err := ts.ar.UpdateBalanceWithTx(ctx, tx, *destAccountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update destination account balance")
			}
		}
	case "income":
		if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	case "expense":
		if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	}
	return nil
}

func (ts TransactionService) revertBalanceChanges(ctx context.Context, tx pgx.Tx, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert source account balance")
			}
			if err := ts.ar.UpdateBalanceWithTx(ctx, tx, *destAccountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert destination account balance")
			}
		}
	case "income":
		if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	case "expense":
		if err := ts.ar.UpdateBalanceWithTx(ctx, tx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	}
	return nil
}
