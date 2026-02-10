package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

type TagService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTagService(rpts *repositories.RootRepository, rdb *redis.Client) TagService {
	return TagService{rpts, rdb}
}

func (ts TagService) GetPaged(ctx context.Context, query models.TagsSearchModel) (models.TagsPagedModel, error) {
	cacheKey := common.BuildPagedCacheKey(constants.EntityTag, query)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, constants.CacheTTLPaged, func(ctx context.Context) (models.TagsPagedModel, error) {
		return ts.rpts.Tag.GetPaged(ctx, query)
	}, "tag")
}

func (ts TagService) GetDetail(ctx context.Context, id int64) (models.TagModel, error) {
	cacheKey := common.BuildDetailCacheKey(constants.EntityTag, id)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, constants.CacheTTLDetail, func(ctx context.Context) (models.TagModel, error) {
		return ts.rpts.Tag.GetDetail(ctx, id)
	}, "tag")
}

func (ts TagService) Create(ctx context.Context, payload models.CreateTagModel) (models.TagModel, error) {
	tag, err := ts.rpts.Tag.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityTag, map[string]interface{}{"tagId": tag.ID}); err != nil {
		observability.NewLogger("service", "TagService").Warn("cache invalidation failed", "error", err)
	}

	return tag, nil
}

func (ts TagService) Update(ctx context.Context, id int64, payload models.UpdateTagModel) (models.TagModel, error) {
	tag, err := ts.rpts.Tag.Update(ctx, id, payload)
	if err != nil {
		return tag, err
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, "tag", map[string]interface{}{"tagId": id}); err != nil {
		observability.NewLogger("service", "TagService").Warn("cache invalidation failed", "error", err)
	}

	return tag, nil
}

func (ts TagService) Delete(ctx context.Context, id int64) error {
	err := ts.rpts.Tag.Delete(ctx, id)
	if err != nil {
		return err
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityTag, map[string]interface{}{"tagId": id}); err != nil {
		observability.NewLogger("service", "TagService").Warn("cache invalidation failed", "error", err)
	}

	return nil
}
