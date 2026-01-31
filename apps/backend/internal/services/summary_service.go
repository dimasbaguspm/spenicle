package services

import (
	"context"
	"encoding/json"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	SummaryCacheTTL = 5 * time.Minute // Shorter TTL for summaries
)

type SummaryService struct {
	sr  repositories.SummaryRepository
	rdb *redis.Client
}

func NewSummaryService(sr repositories.SummaryRepository, rdb *redis.Client) SummaryService {
	return SummaryService{sr, rdb}
}

func (ss SummaryService) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionSearchModel) (models.SummaryTransactionListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryTransactionListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	data, _ := json.Marshal(p)
	cacheKey := common.SummaryTransactionCacheKeyPrefix + string(data)

	summary, err := common.GetCache[models.SummaryTransactionListModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return summary, nil
	}

	summary, err = ss.sr.GetTransactionSummary(ctx, p)
	if err != nil {
		return summary, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, summary, SummaryCacheTTL)

	return summary, nil
}

func (ss SummaryService) GetAccountSummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryAccountListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryAccountListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	data, _ := json.Marshal(p)
	cacheKey := common.SummaryAccountCacheKeyPrefix + string(data)

	summary, err := common.GetCache[models.SummaryAccountListModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return summary, nil
	}

	summary, err = ss.sr.GetAccountSummary(ctx, p)
	if err != nil {
		return summary, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, summary, SummaryCacheTTL)

	return summary, nil
}

func (ss SummaryService) GetCategorySummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryCategoryListModel, error) {
	if p.EndDate.Before(p.StartDate) {
		return models.SummaryCategoryListModel{}, huma.Error400BadRequest("endDate must be after or equal to startDate")
	}

	data, _ := json.Marshal(p)
	cacheKey := common.SummaryCategoryCacheKeyPrefix + string(data)

	summary, err := common.GetCache[models.SummaryCategoryListModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return summary, nil
	}

	summary, err = ss.sr.GetCategorySummary(ctx, p)
	if err != nil {
		return summary, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, summary, SummaryCacheTTL)

	return summary, nil
}
