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
	TransactionRelationCacheTTL = 10 * time.Minute
)

type TransactionRelationService struct {
	trr repositories.TransactionRelationRepository
	tr  repositories.TransactionRepository
	rdb *redis.Client
}

func NewTransactionRelationService(
	trr repositories.TransactionRelationRepository,
	tr repositories.TransactionRepository,
	rdb *redis.Client,
) TransactionRelationService {
	return TransactionRelationService{trr, tr, rdb}
}

func (trs TransactionRelationService) GetPaged(ctx context.Context, q models.TransactionRelationsSearchModel) (models.TransactionRelationsPagedModel, error) {
	data, _ := json.Marshal(q)
	cacheKey := constants.TransactionRelationsPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.TransactionRelationsPagedModel](ctx, trs.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = trs.trr.GetPaged(ctx, q)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, trs.rdb, cacheKey, paged, TransactionRelationCacheTTL)

	return paged, nil
}

func (trs TransactionRelationService) GetDetail(ctx context.Context, p models.TransactionRelationGetModel) (models.TransactionRelationModel, error) {
	cacheKey := fmt.Sprintf(constants.TransactionRelationCacheKeyPrefix+"%d-%d", p.SourceTransactionID, p.RelationID)

	relation, err := common.GetCache[models.TransactionRelationModel](ctx, trs.rdb, cacheKey)
	if err == nil {
		return relation, nil
	}

	relation, err = trs.trr.GetDetail(ctx, p)
	if err != nil {
		return relation, err
	}

	common.SetCache(ctx, trs.rdb, cacheKey, relation, TransactionRelationCacheTTL)

	return relation, nil
}

func (trs TransactionRelationService) Create(ctx context.Context, p models.CreateTransactionRelationModel) (models.TransactionRelationModel, error) {
	relation, err := trs.trr.Create(ctx, p)
	if err != nil {
		return relation, err
	}

	cacheKey := fmt.Sprintf(constants.TransactionRelationCacheKeyPrefix+"%d-%d", p.SourceTransactionID, relation.ID)
	common.SetCache(ctx, trs.rdb, cacheKey, relation, TransactionRelationCacheTTL)
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, trs.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", p.SourceTransactionID))
	common.InvalidateCache(ctx, trs.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", p.RelatedTransactionID))
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")

	return relation, nil
}

func (trs TransactionRelationService) Delete(ctx context.Context, p models.DeleteTransactionRelationModel) error {
	// Get relation details before deletion to know which transaction caches to invalidate
	relation, err := trs.trr.GetDetail(ctx, models.TransactionRelationGetModel{
		SourceTransactionID: p.SourceTransactionID,
		RelationID:          p.RelationID,
	})
	if err != nil {
		return err
	}

	err = trs.trr.Delete(ctx, p)
	if err != nil {
		return err
	}

	cacheKey := fmt.Sprintf(constants.TransactionRelationCacheKeyPrefix+"%d-%d", p.SourceTransactionID, p.RelationID)
	common.InvalidateCache(ctx, trs.rdb, cacheKey)
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionRelationsPagedCacheKeyPrefix+"*")
	// Invalidate related transaction caches
	common.InvalidateCache(ctx, trs.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", p.SourceTransactionID))
	common.InvalidateCache(ctx, trs.rdb, fmt.Sprintf(constants.TransactionCacheKeyPrefix+"%d", relation.RelatedTransactionID))
	common.InvalidateCache(ctx, trs.rdb, constants.TransactionsPagedCacheKeyPrefix+"*")

	return nil
}
