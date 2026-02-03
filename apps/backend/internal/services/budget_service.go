package services

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	BudgetCacheTTL = 10 * time.Minute
)

type BudgetService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewBudgetService(rpts *repositories.RootRepository, rdb *redis.Client) BudgetService {
	return BudgetService{rpts, rdb}
}

func (bs BudgetService) GetPaged(ctx context.Context, p models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.BudgetsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, bs.rdb, cacheKey, BudgetCacheTTL, func(ctx context.Context) (models.BudgetsPagedModel, error) {
		return bs.rpts.Budg.GetPaged(ctx, p)
	}, "budget")
}

func (bs BudgetService) GetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.BudgetCacheKeyPrefix)
	return common.FetchWithCache(ctx, bs.rdb, cacheKey, BudgetCacheTTL, func(ctx context.Context) (models.BudgetModel, error) {
		return bs.rpts.Budg.GetDetail(ctx, id)
	}, "budget")
}

func (bs BudgetService) Create(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget cannot be associated with both account and category")
	}

	budget, err := bs.rpts.Budg.Create(ctx, p)
	if err != nil {
		return budget, err
	}

	common.InvalidateCache(ctx, bs.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	// Invalidate related account/category caches
	common.InvalidateCache(ctx, bs.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoryCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

	return budget, nil
}

func (bs BudgetService) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	budget, err := bs.rpts.Budg.Update(ctx, id, p)
	if err != nil {
		return budget, err
	}

	common.InvalidateCache(ctx, bs.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	// Invalidate related account/category caches
	common.InvalidateCache(ctx, bs.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoryCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

	return budget, nil
}

func (bs BudgetService) Delete(ctx context.Context, id int64) error {
	// Get budget details before deletion to know which caches to invalidate
	_, err := bs.rpts.Budg.GetDetail(ctx, id)
	if err != nil {
		return err
	}

	err = bs.rpts.Budg.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, bs.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	// Invalidate related account/category caches
	common.InvalidateCache(ctx, bs.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.AccountsPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoryCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

	return nil
}

func (bs BudgetService) DeactivateExistingActiveBudgets(ctx context.Context, accountID, categoryID *int64, periodType string) error {
	return bs.rpts.Budg.DeactivateExistingActiveBudgets(ctx, accountID, categoryID, periodType)
}
