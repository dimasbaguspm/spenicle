package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

const (
	TransactionCacheTTL = 10 * time.Minute
)

type TransactionService struct {
	tr  repositories.TransactionRepository
	ar  repositories.AccountRepository
	cr  repositories.CategoryRepository
	rdb *redis.Client
}

func NewTransactionService(tr repositories.TransactionRepository, ar repositories.AccountRepository, cr repositories.CategoryRepository, rdb *redis.Client) TransactionService {
	return TransactionService{tr, ar, cr, rdb}
}

func (ts TransactionService) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := constants.TransactionsPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.TransactionsPagedModel](ctx, ts.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = ts.tr.GetPaged(ctx, p)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, ts.rdb, cacheKey, paged, TransactionCacheTTL)

	return paged, nil
}

func (ts TransactionService) GetDetail(ctx context.Context, id int64) (models.TransactionModel, error) {
	cacheKey := fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", id)

	transaction, err := common.GetCache[models.TransactionModel](ctx, ts.rdb, cacheKey)
	if err == nil {
		return transaction, nil
	}

	transaction, err = ts.tr.GetDetail(ctx, id)
	if err != nil {
		return transaction, err
	}

	common.SetCache(ctx, ts.rdb, cacheKey, transaction, TransactionCacheTTL)

	return transaction, nil
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {
	if err := ts.validateReferences(ctx, p.Type, p.AccountID, p.DestinationAccountID, &p.CategoryID); err != nil {
		return models.TransactionModel{}, err
	}

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

	transaction, err := ts.tr.GetDetail(ctx, transactionID)
	if err != nil {
		return models.TransactionModel{}, err
	}

	common.SetCache(ctx, ts.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", transaction.ID), transaction, TransactionCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, "account:*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")

	return transaction, nil
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
	newCategoryID := existing.Category.ID
	if p.CategoryID != nil {
		newCategoryID = *p.CategoryID
	}
	newDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		newDestAccountID = &existing.DestinationAccount.ID
	}
	if p.DestinationAccountID != nil && *p.DestinationAccountID != 0 {
		newDestAccountID = p.DestinationAccountID
	}

	if err := ts.validateReferences(ctx, newType, newAccountID, newDestAccountID, &newCategoryID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.applyBalanceChanges(ctx, tx, newType, newAmount, newAccountID, newDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	transaction, err := ts.tr.GetDetail(ctx, id)
	if err != nil {
		return models.TransactionModel{}, err
	}

	common.SetCache(ctx, ts.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", id), transaction, TransactionCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	// Invalidate account caches since balances changed
	common.InvalidateCache(ctx, ts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")
	return transaction, nil
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

	common.InvalidateCache(ctx, ts.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	// Invalidate account caches since balances changed
	common.InvalidateCache(ctx, ts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")
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

func (ts TransactionService) validateReferences(ctx context.Context, txType string, accountID int64, destAccountID *int64, categoryID *int64) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		if _, err := ts.ar.GetDetail(ctx, accountID); err != nil {
			return huma.Error400BadRequest("Account not found", err)
		}
		return nil
	})

	g.Go(func() error {
		if txType == "transfer" {
			if destAccountID == nil || *destAccountID == 0 {
				return huma.Error400BadRequest("Destination account is required for transfer")
			}
		}
		if destAccountID != nil && *destAccountID != 0 {
			if _, err := ts.ar.GetDetail(ctx, *destAccountID); err != nil {
				return huma.Error400BadRequest("Destination account not found", err)
			}
		}
		return nil
	})

	g.Go(func() error {
		if categoryID != nil && *categoryID != 0 {
			cat, err := ts.cr.GetDetail(ctx, *categoryID)
			if err != nil {
				return huma.Error400BadRequest("Category not found", err)
			}
			if txType == "income" || txType == "expense" {
				if cat.Type != txType {
					return huma.Error400BadRequest("Category type does not match transaction type")
				}
			}
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return err
	}
	return nil
}
