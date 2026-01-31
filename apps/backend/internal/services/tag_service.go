package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	TagCacheTTL = 10 * time.Minute
)

type TagService struct {
	repo repositories.TagRepository
	rdb  *redis.Client
}

func NewTagService(repo repositories.TagRepository, rdb *redis.Client) TagService {
	return TagService{repo, rdb}
}

func (ts TagService) GetPaged(ctx context.Context, query models.TagsSearchModel) (models.TagsPagedModel, error) {
	data, _ := json.Marshal(query)
	cacheKey := common.TagsPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.TagsPagedModel](ctx, ts.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = ts.repo.GetPaged(ctx, query)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, ts.rdb, cacheKey, paged, TagCacheTTL)

	return paged, nil
}

func (ts TagService) GetDetail(ctx context.Context, id int64) (models.TagModel, error) {
	cacheKey := fmt.Sprintf(common.TagCacheKeyPrefix+"%d", id)

	tag, err := common.GetCache[models.TagModel](ctx, ts.rdb, cacheKey)
	if err == nil {
		return tag, nil
	}

	tag, err = ts.repo.GetDetail(ctx, id)
	if err != nil {
		return tag, err
	}

	common.SetCache(ctx, ts.rdb, cacheKey, tag, TagCacheTTL)

	return tag, nil
}

func (ts TagService) Create(ctx context.Context, payload models.CreateTagModel) (models.TagModel, error) {
	tag, err := ts.repo.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	common.SetCache(ctx, ts.rdb, fmt.Sprintf(common.TagCacheKeyPrefix+"%d", tag.ID), tag, TagCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, common.TagsPagedCacheKeyPrefix+"*")

	return tag, nil
}

func (ts TagService) Update(ctx context.Context, id int64, payload models.UpdateTagModel) (models.TagModel, error) {
	tag, err := ts.repo.Update(ctx, id, payload)
	if err != nil {
		return tag, err
	}

	cacheKey := fmt.Sprintf(common.TagCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, ts.rdb, cacheKey, tag, TagCacheTTL)
	common.InvalidateCache(ctx, ts.rdb, common.TagsPagedCacheKeyPrefix+"*")

	return tag, nil
}

func (ts TagService) Delete(ctx context.Context, id int64) error {
	err := ts.repo.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, ts.rdb, fmt.Sprintf(common.TagCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, ts.rdb, common.TagsPagedCacheKeyPrefix+"*")

	return nil
}
