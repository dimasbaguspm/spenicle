package services

import (
	"context"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

const (
	TransactionCacheTTL = 10 * time.Minute
)

type TransactionService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTransactionService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionService {
	return TransactionService{
		rpts,
		rdb,
	}
}

func (ts TransactionService) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.TransactionsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, TransactionCacheTTL, func(ctx context.Context) (models.TransactionsPagedModel, error) {
		return ts.rpts.Tsct.GetPaged(ctx, p)
	}, "transaction")
}

func (ts TransactionService) GetDetail(ctx context.Context, id int64) (models.TransactionModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.TransactionCacheKeyPrefix)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, TransactionCacheTTL, func(ctx context.Context) (models.TransactionModel, error) {
		return ts.rpts.Tsct.GetDetail(ctx, id)
	}, "transaction")
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {
	if err := ts.validateReferences(ctx, p.Type, p.AccountID, p.DestinationAccountID, &p.CategoryID); err != nil {
		return models.TransactionModel{}, err
	}

	tx, err := ts.rpts.Pool.Begin(ctx)

	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("Unable to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	transaction, err := rootTx.Tsct.Create(ctx, p)
	if err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.applyBalanceChanges(ctx, rootTx, p.Type, p.Amount, p.AccountID, p.DestinationAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	common.InvalidateCache(ctx, ts.rdb, constants.TransactionCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")
	// Invalidate account statistics caches
	common.InvalidateCache(ctx, ts.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", p.AccountID)+":*")
	// Invalidate category statistics caches
	common.InvalidateCache(ctx, ts.rdb, constants.CategoryStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", p.CategoryID)+":*")
	// Invalidate budget caches since transactions affect budget actual_amount
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")

	return transaction, nil
}

func (ts TransactionService) Update(ctx context.Context, id int64, p models.UpdateTransactionModel) (models.TransactionModel, error) {
	tx, err := ts.rpts.Pool.Begin(ctx)
	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	existing, err := rootTx.Tsct.GetDetail(ctx, id)
	if err != nil {
		return models.TransactionModel{}, err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, rootTx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	transaction, err := rootTx.Tsct.Update(ctx, id, p)
	if err != nil {
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

	if err := ts.applyBalanceChanges(ctx, rootTx, newType, newAmount, newAccountID, newDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	common.InvalidateCache(ctx, ts.rdb, constants.TransactionCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	// Invalidate account caches since balances changed
	common.InvalidateCache(ctx, ts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")
	// Invalidate account statistics caches for both old and new accounts
	common.InvalidateCache(ctx, ts.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", existing.Account.ID)+":*")
	if newAccountID != existing.Account.ID {
		common.InvalidateCache(ctx, ts.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", newAccountID)+":*")
	}
	// Invalidate category statistics caches for both old and new categories
	common.InvalidateCache(ctx, ts.rdb, constants.CategoryStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", existing.Category.ID)+":*")
	if newCategoryID != existing.Category.ID {
		common.InvalidateCache(ctx, ts.rdb, constants.CategoryStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", newCategoryID)+":*")
	}
	// Invalidate budget caches since transactions affect budget actual_amount for both old and new accounts/categories
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	return transaction, nil
}

func (ts TransactionService) Delete(ctx context.Context, id int64) error {
	tx, err := ts.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	existing, err := rootTx.Tsct.GetDetail(ctx, id)
	if err != nil {
		return err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, rootTx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return err
	}

	if err := rootTx.Tsct.Delete(ctx, id); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	common.InvalidateCache(ctx, ts.rdb, constants.TransactionCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	// Invalidate account caches since balances changed
	common.InvalidateCache(ctx, ts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.SummaryTransactionCacheKeyPrefix+"*")
	// Invalidate account statistics caches
	common.InvalidateCache(ctx, ts.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", existing.Account.ID)+":*")
	// Invalidate category statistics caches
	common.InvalidateCache(ctx, ts.rdb, constants.CategoryStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", existing.Category.ID)+":*")
	// Invalidate budget caches since deleting transactions affects budget actual_amount
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, ts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	return nil
}

func (ts TransactionService) applyBalanceChanges(ctx context.Context, root repositories.RootRepository, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update source account balance")
			}
			if err := root.Acc.UpdateBalance(ctx, *destAccountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update destination account balance")
			}
		}
	case "income":
		if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	case "expense":
		if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	}
	return nil
}

func (ts TransactionService) revertBalanceChanges(ctx context.Context, root repositories.RootRepository, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert source account balance")
			}
			if err := root.Acc.UpdateBalance(ctx, *destAccountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert destination account balance")
			}
		}
	case "income":
		if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	case "expense":
		if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	}
	return nil
}

func (ts TransactionService) validateReferences(ctx context.Context, txType string, accountID int64, destAccountID *int64, categoryID *int64) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		if _, err := ts.rpts.Acc.GetDetail(ctx, accountID); err != nil {
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
			if _, err := ts.rpts.Acc.GetDetail(ctx, *destAccountID); err != nil {
				return huma.Error400BadRequest("Destination account not found", err)
			}
		}
		return nil
	})

	g.Go(func() error {
		if categoryID != nil && *categoryID != 0 {
			cat, err := ts.rpts.Cat.GetDetail(ctx, *categoryID)
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
