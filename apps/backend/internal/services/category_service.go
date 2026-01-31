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
	CategoryCacheTTL = 10 * time.Minute
)

type CategoryService struct {
	cr  repositories.CategoryRepository
	rdb *redis.Client
}

func NewCategoryService(cr repositories.CategoryRepository, rdb *redis.Client) CategoryService {
	return CategoryService{
		cr,
		rdb,
	}
}

func (cs CategoryService) GetPaged(ctx context.Context, p models.CategoriesSearchModel) (models.CategoriesPagedModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := common.CategoriesPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.CategoriesPagedModel](ctx, cs.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = cs.cr.GetPaged(ctx, p)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, cs.rdb, cacheKey, paged, CategoryCacheTTL)

	return paged, nil
}

func (cs CategoryService) GetDetail(ctx context.Context, id int64) (models.CategoryModel, error) {
	cacheKey := fmt.Sprintf(common.CategoryCacheKeyPrefix+"%d", id)

	category, err := common.GetCache[models.CategoryModel](ctx, cs.rdb, cacheKey)
	if err == nil {
		return category, nil
	}

	category, err = cs.cr.GetDetail(ctx, id)
	if err != nil {
		return category, err
	}

	common.SetCache(ctx, cs.rdb, cacheKey, category, CategoryCacheTTL)

	return category, nil
}

func (cs CategoryService) Create(ctx context.Context, p models.CreateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.cr.Create(ctx, p)
	if err != nil {
		return category, err
	}

	common.SetCache(ctx, cs.rdb, fmt.Sprintf(common.CategoryCacheKeyPrefix+"%d", category.ID), category, CategoryCacheTTL)
	common.InvalidateCache(ctx, cs.rdb, common.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, common.SummaryCategoryCacheKeyPrefix+"*")

	return category, nil
}

func (cs CategoryService) Update(ctx context.Context, id int64, p models.UpdateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.cr.Update(ctx, id, p)
	if err != nil {
		return category, err
	}

	cacheKey := fmt.Sprintf(common.CategoryCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, cs.rdb, cacheKey, category, CategoryCacheTTL)
	common.InvalidateCache(ctx, cs.rdb, common.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, common.SummaryCategoryCacheKeyPrefix+"*")

	return category, nil
}

func (cs CategoryService) Delete(ctx context.Context, id int64) error {
	tx, err := cs.cr.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := cs.cr.DeleteWithTx(ctx, tx, id); err != nil {
		return err
	}

	ids, err := cs.cr.GetActiveIDsOrderedWithTx(ctx, tx)
	if err != nil {
		return err
	}

	if err := cs.cr.ReorderWithTx(ctx, tx, ids); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, cs.rdb, fmt.Sprintf(common.CategoryCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, cs.rdb, common.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, common.SummaryCategoryCacheKeyPrefix+"*")

	return nil
}

func (cs CategoryService) Reorder(ctx context.Context, p models.ReorderCategoriesModel) error {
	if len(p.Items) == 0 {
		return huma.Error400BadRequest("No category IDs provided for reordering")
	}

	if err := cs.cr.ValidateIDsExist(ctx, p.Items); err != nil {
		return err
	}

	tx, err := cs.cr.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := cs.cr.ReorderWithTx(ctx, tx, p.Items); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit reorder transaction", err)
	}
	tx = nil

	common.InvalidateCache(ctx, cs.rdb, common.CategoryCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, common.CategoriesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, cs.rdb, common.SummaryCategoryCacheKeyPrefix+"*")

	return nil
}
