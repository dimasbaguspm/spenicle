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
	TransactionTagCacheTTL = 10 * time.Minute
)

type TransactionTagService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTransactionTagService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionTagService {
	return TransactionTagService{rpts, rdb}
}

func (tts TransactionTagService) GetPaged(ctx context.Context, q models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, q, constants.TransactionTagsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTagCacheTTL, func(ctx context.Context) (models.TransactionTagsPagedModel, error) {
		return tts.rpts.TsctTag.GetPaged(ctx, q)
	}, "transaction_tag")
}

func (tts TransactionTagService) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	cacheKey := common.BuildCacheKey(ID, nil, constants.TransactionTagCacheKeyPrefix)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTagCacheTTL, func(ctx context.Context) (models.TransactionTagModel, error) {
		return tts.rpts.TsctTag.GetDetail(ctx, ID)
	}, "transaction_tag")
}

func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	tag, err := tts.rpts.TsctTag.Create(ctx, payload)
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
	err := tts.rpts.TsctTag.Delete(ctx, transactionID, tagID)
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
