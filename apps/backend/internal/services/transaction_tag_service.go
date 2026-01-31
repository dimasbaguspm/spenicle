package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	TransactionTagCacheTTL = 10 * time.Minute
)

type TransactionTagService struct {
	repo repositories.TransactionTagRepository
	rdb  *redis.Client
}

func NewTransactionTagService(repo repositories.TransactionTagRepository, rdb *redis.Client) TransactionTagService {
	return TransactionTagService{repo, rdb}
}

func (tts TransactionTagService) GetPaged(ctx context.Context, q models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	data, _ := json.Marshal(q)
	cacheKey := constants.TransactionTagsPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.TransactionTagsPagedModel](ctx, tts.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = tts.repo.GetPaged(ctx, q)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, tts.rdb, cacheKey, paged, TransactionTagCacheTTL)

	return paged, nil
}

func (tts TransactionTagService) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	cacheKey := fmt.Sprintf(constants.TransactionTagCacheKeyPrefix+"%d", ID)

	tag, err := common.GetCache[models.TransactionTagModel](ctx, tts.rdb, cacheKey)
	if err == nil {
		return tag, nil
	}

	tag, err = tts.repo.GetDetail(ctx, ID)
	if err != nil {
		return tag, err
	}

	common.SetCache(ctx, tts.rdb, cacheKey, tag, TransactionTagCacheTTL)

	return tag, nil
}

func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	tag, err := tts.repo.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	common.SetCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionTagCacheKeyPrefix+"%d", tag.ID), tag, TransactionTagCacheTTL)
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionTagsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", payload.TransactionID))
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	return tag, nil
}

func (tts TransactionTagService) Delete(ctx context.Context, transactionID, tagID int64) error {
	err := tts.repo.Delete(ctx, transactionID, tagID)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionTagCacheKeyPrefix+"%d", tagID))
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionTagsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", transactionID))
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")
	return nil
}
