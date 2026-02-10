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
	cacheKey := common.BuildPagedCacheKey(constants.EntityCategory, p)
	return common.FetchWithCache(ctx, cs.rdb, cacheKey, constants.CacheTTLPaged, func(ctx context.Context) (models.CategoriesPagedModel, error) {
		return cs.rpts.Cat.GetPaged(ctx, p)
	}, "category")
}

func (cs CategoryService) GetDetail(ctx context.Context, id int64) (models.CategoryModel, error) {
	cacheKey := common.BuildDetailCacheKey(constants.EntityCategory, id)
	return common.FetchWithCache(ctx, cs.rdb, cacheKey, constants.CacheTTLDetail, func(ctx context.Context) (models.CategoryModel, error) {
		return cs.rpts.Cat.GetDetail(ctx, id)
	}, "category")
}

func (cs CategoryService) Create(ctx context.Context, p models.CreateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.rpts.Cat.Create(ctx, p)
	if err != nil {
		return category, err
	}

	if err := common.InvalidateCacheForEntity(ctx, cs.rdb, constants.EntityCategory, map[string]interface{}{"categoryId": category.ID}); err != nil {
		observability.NewLogger("service", "CategoryService").Warn("cache invalidation failed", "error", err)
	}

	return category, nil
}

func (cs CategoryService) Update(ctx context.Context, id int64, p models.UpdateCategoryModel) (models.CategoryModel, error) {
	category, err := cs.rpts.Cat.Update(ctx, id, p)
	if err != nil {
		return category, err
	}

	if err := common.InvalidateCacheForEntity(ctx, cs.rdb, constants.EntityCategory, map[string]interface{}{"categoryId": id}); err != nil {
		observability.NewLogger("service", "CategoryService").Warn("cache invalidation failed", "error", err)
	}

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

	common.InvalidateCacheForEntity(ctx, cs.rdb, constants.EntityCategory, map[string]interface{}{"categoryId": id})

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

	common.InvalidateCacheForEntity(ctx, cs.rdb, constants.EntityCategory, map[string]interface{}{})

	return nil
}
