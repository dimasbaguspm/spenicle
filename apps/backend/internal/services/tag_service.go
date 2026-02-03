package services

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	TagCacheTTL = 10 * time.Minute
)

type TagService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTagService(rpts *repositories.RootRepository, rdb *redis.Client) TagService {
	return TagService{rpts, rdb}
}

func (ts TagService) GetPaged(ctx context.Context, query models.TagsSearchModel) (models.TagsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, query, constants.TagsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, TagCacheTTL, func(ctx context.Context) (models.TagsPagedModel, error) {
		return ts.rpts.Tag.GetPaged(ctx, query)
	})
}

func (ts TagService) GetDetail(ctx context.Context, id int64) (models.TagModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.TagCacheKeyPrefix)
	return common.FetchWithCache(ctx, ts.rdb, cacheKey, TagCacheTTL, func(ctx context.Context) (models.TagModel, error) {
		return ts.rpts.Tag.GetDetail(ctx, id)
	})
}

func (ts TagService) Create(ctx context.Context, payload models.CreateTagModel) (models.TagModel, error) {
	tag, err := ts.rpts.Tag.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	common.SetCache(ctx, ts.rdb, fmt.Sprintf(constants.TagCacheKeyPrefix+"%d", tag.ID), tag, TagCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, constants.TagsPagedCacheKeyPrefix+"*")

	return tag, nil
}

func (ts TagService) Update(ctx context.Context, id int64, payload models.UpdateTagModel) (models.TagModel, error) {
	tag, err := ts.rpts.Tag.Update(ctx, id, payload)
	if err != nil {
		return tag, err
	}

	cacheKey := fmt.Sprintf(constants.TagCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, ts.rdb, cacheKey, tag, TagCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, constants.TagsPagedCacheKeyPrefix+"*")

	return tag, nil
}

func (ts TagService) Delete(ctx context.Context, id int64) error {
	err := ts.rpts.Tag.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, ts.rdb, fmt.Sprintf(constants.TagCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, ts.rdb, constants.TagsPagedCacheKeyPrefix+"*")

	return nil
}
