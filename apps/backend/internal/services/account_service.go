package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
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
	cacheKey := common.BuildPagedCacheKey(constants.EntityAccount, p)
	return common.FetchWithCache(ctx, as.rdb, cacheKey, constants.CacheTTLPaged, func(ctx context.Context) (models.AccountsPagedModel, error) {
		return as.rpts.Acc.GetPaged(ctx, p)
	}, "account")
}

func (as AccountService) GetDetail(ctx context.Context, id int64) (models.AccountModel, error) {
	cacheKey := common.BuildDetailCacheKey(constants.EntityAccount, id)
	return common.FetchWithCache(ctx, as.rdb, cacheKey, constants.CacheTTLDetail, func(ctx context.Context) (models.AccountModel, error) {
		return as.rpts.Acc.GetDetail(ctx, id)
	}, "account")
}

func (as AccountService) Create(ctx context.Context, p models.CreateAccountModel) (models.AccountModel, error) {
	account, err := as.rpts.Acc.Create(ctx, p)
	if err != nil {
		return account, err
	}

	if err := common.InvalidateCacheForEntity(ctx, as.rdb, constants.EntityAccount, map[string]interface{}{"accountId": account.ID}); err != nil {
		observability.NewLogger("service", "AccountService").Warn("cache invalidation failed", "error", err)
	}

	return account, nil
}

func (as AccountService) Update(ctx context.Context, id int64, p models.UpdateAccountModel) (models.AccountModel, error) {
	account, err := as.rpts.Acc.Update(ctx, id, p)
	if err != nil {
		return account, err
	}

	if err := common.InvalidateCacheForEntity(ctx, as.rdb, constants.EntityAccount, map[string]interface{}{"accountId": id}); err != nil {
		observability.NewLogger("service", "AccountService").Warn("cache invalidation failed", "error", err)
	}
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

	common.InvalidateCacheForEntity(ctx, as.rdb, constants.EntityAccount, map[string]interface{}{"accountId": id})

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

	common.InvalidateCacheForEntity(ctx, as.rdb, constants.EntityAccount, map[string]interface{}{})

	return nil
}
