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
	"github.com/redis/go-redis/v9"
)

const (
	CategoryCacheTTL = 10 * time.Minute
)

type CategoryService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewCategoryService(rpts *repositories.RootRepository, rdb *redis.Client) CategoryService {
	return CategoryService{
		rpts,
		rdb,
	}
}

func (cs CategoryService) GetPaged(ctx context.Context, p models.CategoriesSearchModel) (models.CategoriesPagedModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := constants.CategoriesPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.CategoriesPagedModel](ctx, cs.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = cs.rpts.Cat.GetPaged(ctx, p)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, cs.rdb, cacheKey, paged, CategoryCacheTTL)

	return paged, nil
}

func (cs CategoryService) GetDetail(ctx context.Context, id int64) (models.CategoryModel, error) {
	cacheKey := fmt.Sprintf(constants.CategoryCacheKeyPrefix+"%d", id)

	category, err := common.GetCache[models.CategoryModel](ctx, cs.rdb, cacheKey)
	if err == nil {
		return category, nil
	}

	category, err = cs.rpts.Cat.GetDetail(ctx, id)
	if err != nil {
		return category, err
	}

	common.SetCache(ctx, cs.rdb, cacheKey, category, CategoryCacheTTL)

	return category, nil
}

func (cs CategoryService) Create(ctx context.Context, p models.CreateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.rpts.Cat.Create(ctx, p)
	if err != nil {
		return category, err
	}

	common.SetCache(ctx, cs.rdb, fmt.Sprintf(constants.CategoryCacheKeyPrefix+"%d", category.ID), category, CategoryCacheTTL)
	common.InvalidateCache(ctx, cs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, constants.SummaryCategoryCacheKeyPrefix+"*")

	return category, nil
}

func (cs CategoryService) Update(ctx context.Context, id int64, p models.UpdateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.rpts.Cat.Update(ctx, id, p)
	if err != nil {
		return category, err
	}

	cacheKey := fmt.Sprintf(constants.CategoryCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, cs.rdb, cacheKey, category, CategoryCacheTTL)
	common.InvalidateCache(ctx, cs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, constants.SummaryCategoryCacheKeyPrefix+"*")

	return category, nil
}

func (cs CategoryService) Delete(ctx context.Context, id int64) error {
	tx, err := cs.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	rootTx := cs.rpts.WithTx(ctx, tx)
	if err := rootTx.Cat.Delete(ctx, id); err != nil {
		return err
	}

	ids, err := rootTx.Cat.GetActiveIDsOrdered(ctx)
	if err != nil {
		return err
	}

	if err := rootTx.Cat.Reorder(ctx, ids); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, cs.rdb, fmt.Sprintf(constants.CategoryCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, cs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, constants.SummaryCategoryCacheKeyPrefix+"*")

	return nil
}

func (cs CategoryService) Reorder(ctx context.Context, p models.ReorderCategoriesModel) error {
	if len(p.Items) == 0 {
		return huma.Error400BadRequest("No category IDs provided for reordering")
	}

	if err := cs.rpts.Cat.ValidateIDsExist(ctx, p.Items); err != nil {
		return err
	}

	tx, err := cs.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	rootTx := cs.rpts.WithTx(ctx, tx)
	if err := rootTx.Cat.Reorder(ctx, p.Items); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit reorder transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, cs.rdb, constants.CategoryCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, constants.SummaryCategoryCacheKeyPrefix+"*")

	return nil
}
