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
	TransactionTemplateCacheTTL = 10 * time.Minute
)

type TransactionTemplateService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewTransactionTemplateService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionTemplateService {
	return TransactionTemplateService{rpts, rdb}
}

func (tts TransactionTemplateService) GetPaged(ctx context.Context, query models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, query, constants.TransactionTemplatesPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTemplateCacheTTL, func(ctx context.Context) (models.TransactionTemplatesPagedModel, error) {
		return tts.rpts.TsctTem.GetPaged(ctx, query)
	})
}

func (tts TransactionTemplateService) GetDetail(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.TransactionTemplateCacheKeyPrefix)
	return common.FetchWithCache(ctx, tts.rdb, cacheKey, TransactionTemplateCacheTTL, func(ctx context.Context) (models.TransactionTemplateModel, error) {
		return tts.rpts.TsctTem.GetDetail(ctx, id)
	})
}

func (tts TransactionTemplateService) Create(ctx context.Context, payload models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	template, err := tts.rpts.TsctTem.Create(ctx, payload)
	if err != nil {
		return template, err
	}

	common.SetCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionTemplateCacheKeyPrefix+"%d", template.ID), template, TransactionTemplateCacheTTL)
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (tts TransactionTemplateService) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	template, err := tts.rpts.TsctTem.Update(ctx, id, payload)
	if err != nil {
		return template, err
	}

	cacheKey := fmt.Sprintf(constants.TransactionTemplateCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, tts.rdb, cacheKey, template, TransactionTemplateCacheTTL)
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (tts TransactionTemplateService) Delete(ctx context.Context, id int64) error {
	err := tts.rpts.TsctTem.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, tts.rdb, fmt.Sprintf(constants.TransactionTemplateCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, tts.rdb, constants.TransactionTemplatesPagedCacheKeyPrefix+"*")

	return nil
}

func (tts TransactionTemplateService) GetRelatedTransactions(ctx context.Context, templateID int64, query models.TransactionTemplateRelatedTransactionsSearchModel) (models.TransactionsPagedModel, error) {
	ids, err := tts.rpts.TsctTem.GetRelatedTransactions(ctx, templateID, query)
	if err != nil {
		return models.TransactionsPagedModel{}, err
	}

	if len(ids) == 0 {
		return models.TransactionsPagedModel{
			Items:      []models.TransactionModel{},
			PageNumber: query.PageNumber,
			PageSize:   query.PageSize,
			TotalCount: 0,
			TotalPages: 0,
		}, nil
	}

	var intIDs []int
	for _, id := range ids {
		intIDs = append(intIDs, int(id))
	}

	searchModel := models.TransactionsSearchModel{
		PageNumber:            query.PageNumber,
		PageSize:              query.PageSize,
		SortBy:                query.SortBy,
		SortOrder:             query.SortOrder,
		IDs:                   intIDs,
		Type:                  query.Type,
		AccountIDs:            query.AccountIDs,
		CategoryIDs:           query.CategoryIDs,
		DestinationAccountIDs: query.DestinationAccountIDs,
		TagIDs:                query.TagIDs,
		StartDate:             query.StartDate,
		EndDate:               query.EndDate,
		MinAmount:             query.MinAmount,
		MaxAmount:             query.MaxAmount,
	}

	return tts.rpts.Tsct.GetPaged(ctx, searchModel)
}
