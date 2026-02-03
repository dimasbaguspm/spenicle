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
)

const (
	AccountCacheTTL = 10 * time.Minute
)

type AccountService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewAccountService(rpts *repositories.RootRepository, rdb *redis.Client) AccountService {
	return AccountService{
		rpts,
		rdb,
	}
}

func (as AccountService) GetPaged(ctx context.Context, p models.AccountsSearchModel) (models.AccountsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.AccountsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, as.rdb, cacheKey, AccountCacheTTL, func(ctx context.Context) (models.AccountsPagedModel, error) {
		return as.rpts.Acc.GetPaged(ctx, p)
	}, "account")
}

func (as AccountService) GetDetail(ctx context.Context, id int64) (models.AccountModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.AccountCacheKeyPrefix)
	return common.FetchWithCache(ctx, as.rdb, cacheKey, AccountCacheTTL, func(ctx context.Context) (models.AccountModel, error) {
		return as.rpts.Acc.GetDetail(ctx, id)
	}, "account")
}

func (as AccountService) Create(ctx context.Context, p models.CreateAccountModel) (models.AccountModel, error) {
	account, err := as.rpts.Acc.Create(ctx, p)
	if err != nil {
		return account, err
	}

	common.InvalidateCache(ctx, as.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, as.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	// Invalidate account summaries
	common.InvalidateCache(ctx, as.rdb, constants.SummaryAccountCacheKeyPrefix+"*")
	// Invalidate account statistics caches
	common.InvalidateCache(ctx, as.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", account.ID)+":*")

	return account, nil
}

func (as AccountService) Update(ctx context.Context, id int64, p models.UpdateAccountModel) (models.AccountModel, error) {
	account, err := as.rpts.Acc.Update(ctx, id, p)
	if err != nil {
		return account, err
	}

	common.InvalidateCache(ctx, as.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, as.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	// Invalidate account summaries
	common.InvalidateCache(ctx, as.rdb, constants.SummaryAccountCacheKeyPrefix+"*")
	// Invalidate account statistics caches
	common.InvalidateCache(ctx, as.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", id)+":*")
	return account, nil
}

func (as AccountService) Delete(ctx context.Context, id int64) error {
	tx, err := as.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	rootTx := as.rpts.WithTx(ctx, tx)
	if err := rootTx.Acc.Delete(ctx, id); err != nil {
		return err
	}

	ids, err := rootTx.Acc.GetActiveIDsOrdered(ctx)
	if err != nil {
		return err
	}

	if err := rootTx.Acc.Reorder(ctx, ids); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, as.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, as.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	// Invalidate account summaries
	common.InvalidateCache(ctx, as.rdb, constants.SummaryAccountCacheKeyPrefix+"*")
	// Invalidate account statistics caches
	common.InvalidateCache(ctx, as.rdb, constants.AccountStatisticsCacheKeyPrefix+"*:"+fmt.Sprintf("%d", id)+":*")

	return nil
}

func (as AccountService) Reorder(ctx context.Context, p models.ReorderAccountsModel) error {
	if len(p.Data) == 0 {
		return huma.Error400BadRequest("No account IDs provided for reordering")
	}

	if err := as.rpts.Acc.ValidateIDsExist(ctx, p.Data); err != nil {
		return err
	}

	tx, err := as.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	rootTx := as.rpts.WithTx(ctx, tx)
	if err := rootTx.Acc.Reorder(ctx, p.Data); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit reorder transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, as.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, as.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	// Invalidate account summaries
	common.InvalidateCache(ctx, as.rdb, constants.SummaryAccountCacheKeyPrefix+"*")
	// Invalidate all account statistics caches
	common.InvalidateCache(ctx, as.rdb, constants.AccountStatisticsCacheKeyPrefix+"*")

	return nil
}
