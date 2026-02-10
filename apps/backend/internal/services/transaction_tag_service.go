package services

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
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
	cacheKey := common.BuildPagedCacheKey("transaction_tag", q)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTagCacheTTL, func(ctx context.Context) (models.TransactionTagsPagedModel, error) {
		return tts.rpts.TsctTag.GetPaged(ctx, q)
	}, "transaction_tag")
}

func (tts TransactionTagService) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	cacheKey := common.BuildDetailCacheKey("transaction_tag", ID)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTagCacheTTL, func(ctx context.Context) (models.TransactionTagModel, error) {
		return tts.rpts.TsctTag.GetDetail(ctx, ID)
	}, "transaction_tag")
}

func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	tag, err := tts.rpts.TsctTag.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	common.InvalidateCacheForEntity(ctx, tts.rdb, "transaction_tag", map[string]interface{}{"tagId": tag.ID})
	return tag, nil
}

func (tts TransactionTagService) Delete(ctx context.Context, transactionID, tagID int64) error {
	err := tts.rpts.TsctTag.Delete(ctx, transactionID, tagID)
	if err != nil {
		return err
	}

	common.InvalidateCacheForEntity(ctx, tts.rdb, "transaction_tag", map[string]interface{}{"tagId": tagID})
	return nil
}
