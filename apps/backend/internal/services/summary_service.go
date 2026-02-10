package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

type SummaryService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewSummaryService(rpts *repositories.RootRepository, rdb *redis.Client) SummaryService {
	return SummaryService{rpts, rdb}
}

func (ss SummaryService) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionSearchModel) (models.SummaryTransactionListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryTransactionListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	cacheKey := common.BuildPagedCacheKey(constants.SummaryTransaction, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLSummary, func(ctx context.Context) (models.SummaryTransactionListModel, error) {
		return ss.rpts.Sum.GetTransactionSummary(ctx, p)
	}, "summary")
}

func (ss SummaryService) GetAccountSummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryAccountListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryAccountListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	cacheKey := common.BuildPagedCacheKey(constants.SummaryAccount, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLSummary, func(ctx context.Context) (models.SummaryAccountListModel, error) {
		return ss.rpts.Sum.GetAccountSummary(ctx, p)
	}, "summary")
}

func (ss SummaryService) GetCategorySummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryCategoryListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryCategoryListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	cacheKey := common.BuildPagedCacheKey(constants.SummaryCategory, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLSummary, func(ctx context.Context) (models.SummaryCategoryListModel, error) {
		return ss.rpts.Sum.GetCategorySummary(ctx, p)
	}, "summary")
}
