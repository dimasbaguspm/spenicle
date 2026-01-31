package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	BudgetTemplateCacheTTL = 10 * time.Minute
)

type BudgetTemplateService struct {
	btr repositories.BudgetTemplateRepository
	br  repositories.BudgetRepository
	rdb *redis.Client
}

func NewBudgetTemplateService(btr repositories.BudgetTemplateRepository, br repositories.BudgetRepository, rdb *redis.Client) BudgetTemplateService {
	return BudgetTemplateService{btr, br, rdb}
}

func (bts BudgetTemplateService) GetPaged(ctx context.Context, p models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := constants.BudgetTemplatesPagedCacheKeyPrefix + string(data)

	paged, err := common.GetCache[models.BudgetTemplatesPagedModel](ctx, bts.rdb, cacheKey)
	if err == nil {
		return paged, nil
	}

	paged, err = bts.btr.GetPaged(ctx, p)
	if err != nil {
		return paged, err
	}

	common.SetCache(ctx, bts.rdb, cacheKey, paged, BudgetTemplateCacheTTL)

	return paged, nil
}

func (bts BudgetTemplateService) GetDetail(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	cacheKey := fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", id)

	template, err := common.GetCache[models.BudgetTemplateModel](ctx, bts.rdb, cacheKey)
	if err == nil {
		return template, nil
	}

	template, err = bts.btr.GetDetail(ctx, id)
	if err != nil {
		return template, err
	}

	common.SetCache(ctx, bts.rdb, cacheKey, template, BudgetTemplateCacheTTL)

	return template, nil
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template cannot be associated with both account and category")
	}

	template, err := bts.btr.Create(ctx, p)
	if err != nil {
		return template, err
	}

	common.SetCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", template.ID), template, BudgetTemplateCacheTTL)
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	template, err := bts.btr.Update(ctx, id, p)
	if err != nil {
		return template, err
	}

	cacheKey := fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", id)
	common.SetCache(ctx, bts.rdb, cacheKey, template, BudgetTemplateCacheTTL)
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (bts BudgetTemplateService) Delete(ctx context.Context, id int64) error {
	err := bts.btr.Delete(ctx, id)
	if err != nil {
		return err
	}

	common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	return nil
}

func (bts BudgetTemplateService) GetRelatedBudgets(ctx context.Context, templateID int64, query models.BudgetTemplateRelatedBudgetsSearchModel) (models.BudgetsPagedModel, error) {
	ids, err := bts.btr.GetRelatedBudgets(ctx, templateID, query)
	if err != nil {
		return models.BudgetsPagedModel{}, err
	}

	if len(ids) == 0 {
		return models.BudgetsPagedModel{
			Items:      []models.BudgetModel{},
			PageNumber: query.PageNumber,
			PageSize:   query.PageSize,
			TotalCount: 0,
			TotalPages: 0,
		}, nil
	}

	var intIDs []int64
	for _, id := range ids {
		intIDs = append(intIDs, id)
	}

	searchModel := models.BudgetsSearchModel{
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		SortBy:     query.SortBy,
		SortOrder:  query.SortOrder,
		IDs:        intIDs,
	}

	return bts.br.GetPaged(ctx, searchModel)
}
