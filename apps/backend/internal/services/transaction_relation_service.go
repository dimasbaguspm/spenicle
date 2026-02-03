package services

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	TransactionRelationCacheTTL = 10 * time.Minute
)

type TransactionRelationService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTransactionRelationService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionRelationService {
	return TransactionRelationService{rpts, rdb}
}

func (trs TransactionRelationService) GetPaged(ctx context.Context, q models.TransactionRelationsSearchModel) (models.TransactionRelationsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, q, constants.TransactionRelationsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, trs.rdb, cacheKey, TransactionRelationCacheTTL, func(ctx context.Context) (models.TransactionRelationsPagedModel, error) {
		return trs.rpts.TsctRel.GetPaged(ctx, q)
	}, "transaction_relation")
}

func (trs TransactionRelationService) GetDetail(ctx context.Context, p models.TransactionRelationGetModel) (models.TransactionRelationModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.TransactionRelationCacheKeyPrefix)
	return common.FetchWithCache(ctx, trs.rdb, cacheKey, TransactionRelationCacheTTL, func(ctx context.Context) (models.TransactionRelationModel, error) {
		return trs.rpts.TsctRel.GetDetail(ctx, p)
	}, "transaction_relation")
}

func (trs TransactionRelationService) Create(ctx context.Context, p models.CreateTransactionRelationModel) (models.TransactionRelationModel, error) {
	relation, err := trs.rpts.TsctRel.Create(ctx, p)
	if err != nil {
		return relation, err
	}

	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")

	return relation, nil
}

func (trs TransactionRelationService) Delete(ctx context.Context, p models.DeleteTransactionRelationModel) error {
	// Get relation details before deletion to know which transaction caches to invalidate
	_, err := trs.rpts.TsctRel.GetDetail(ctx, models.TransactionRelationGetModel{
		SourceTransactionID: p.SourceTransactionID,
		RelationID:          p.RelationID,
	})
	if err != nil {
		return err
	}

	err = trs.rpts.TsctRel.Delete(ctx, p)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")

	return nil
}
