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

type TransactionTagService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTransactionTagService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionTagService {
	return TransactionTagService{rpts, rdb}
}

func (tts TransactionTagService) GetPaged(ctx context.Context, q models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	cacheKey := common.BuildPagedCacheKey(constants.EntityTransactionTag, q)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, constants.CacheTTLPaged, func(ctx context.Context) (models.TransactionTagsPagedModel, error) {
		return tts.rpts.TsctTag.GetPaged(ctx, q)
	}, "transaction_tag")
}

func (tts TransactionTagService) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	cacheKey := common.BuildDetailCacheKey(constants.EntityTransactionTag, ID)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, constants.CacheTTLDetail, func(ctx context.Context) (models.TransactionTagModel, error) {
		return tts.rpts.TsctTag.GetDetail(ctx, ID)
	}, "transaction_tag")
}

func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	tag, err := tts.rpts.TsctTag.Create(ctx, payload)
	if err != nil {
		return tag, err
	}

	// Get transaction to find accountId for cache invalidation
	tx, _ := tts.rpts.Tsct.GetDetail(ctx, payload.TransactionID)
	accountId := tx.Account.ID

	if err := common.InvalidateCacheForEntity(ctx, tts.rdb, constants.EntityTransactionTag, map[string]interface{}{"tagId": tag.ID, "accountId": accountId}); err != nil {
		observability.NewLogger("service", "TransactionTagService").Warn("cache invalidation failed", "error", err)
	}
	return tag, nil
}

func (tts TransactionTagService) Delete(ctx context.Context, transactionID, tagID int64) error {
	err := tts.rpts.TsctTag.Delete(ctx, transactionID, tagID)
	if err != nil {
		return err
	}

	// Get transaction to find accountId for cache invalidation
	tx, _ := tts.rpts.Tsct.GetDetail(ctx, transactionID)
	accountId := tx.Account.ID

	if err := common.InvalidateCacheForEntity(ctx, tts.rdb, constants.EntityTransactionTag, map[string]interface{}{"tagId": tagID, "accountId": accountId}); err != nil {
		observability.NewLogger("service", "TransactionTagService").Warn("cache invalidation failed", "error", err)
	}
	return nil
}
