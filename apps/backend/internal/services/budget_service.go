package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	BudgetCacheTTL = 10 * time.Minute
)

type BudgetService struct {
	br  repositories.BudgetRepository
	rdb *redis.Client
}

func NewBudgetService(br repositories.BudgetRepository, rdb *redis.Client) BudgetService {
	return BudgetService{br, rdb}
}

func (bs BudgetService) GetPaged(ctx context.Context, p models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := common.BudgetsPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.BudgetsPagedModel](ctx, bs.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = bs.br.GetPaged(ctx, p)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, bs.rdb, cacheKey, paged, BudgetCacheTTL)

	return paged, nil
}

func (bs BudgetService) GetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
	cacheKey := fmt.Sprintf(common.BudgetCacheKeyPrefix+"%d", id)

	budget, err := common.GetCache[models.BudgetModel](ctx, bs.rdb, cacheKey)
	if err == nil {
		return budget, nil
	}

	budget, err = bs.br.GetDetail(ctx, id)
	if err != nil {
		return budget, err
	}

	common.SetCache(ctx, bs.rdb, cacheKey, budget, BudgetCacheTTL)

	return budget, nil
}

func (bs BudgetService) Create(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget cannot be associated with both account and category")
	}

	budget, err := bs.br.Create(ctx, p)
	if err != nil {
		return budget, err
	}

	common.SetCache(ctx, bs.rdb, fmt.Sprintf(common.BudgetCacheKeyPrefix+"%d", budget.ID), budget, BudgetCacheTTL)
	common.InvalidateCache(ctx, bs.rdb, common.BudgetsPagedCacheKeyPrefix+"*")

	return budget, nil
}

func (bs BudgetService) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	budget, err := bs.br.Update(ctx, id, p)
	if err != nil {
		return budget, err
	}

	cacheKey := fmt.Sprintf(common.BudgetCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, bs.rdb, cacheKey, budget, BudgetCacheTTL)
	common.InvalidateCache(ctx, bs.rdb, common.BudgetsPagedCacheKeyPrefix+"*")

	return budget, nil
}

func (bs BudgetService) Delete(ctx context.Context, id int64) error {
	err := bs.br.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, bs.rdb, fmt.Sprintf(common.BudgetCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, bs.rdb, common.BudgetsPagedCacheKeyPrefix+"*")

	return nil
}

func (bs BudgetService) DeactivateExistingActiveBudgets(ctx context.Context, accountID, categoryID *int64, periodType string) error {
	return bs.br.DeactivateExistingActiveBudgets(ctx, accountID, categoryID, periodType)
}
