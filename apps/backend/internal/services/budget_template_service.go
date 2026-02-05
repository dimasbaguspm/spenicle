package services

import (
	"context"
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
	Rpts *repositories.RootRepository
	rdb  *redis.Client
}

func NewBudgetTemplateService(rpts *repositories.RootRepository, rdb *redis.Client) BudgetTemplateService {
	return BudgetTemplateService{rpts, rdb}
}

func (bts BudgetTemplateService) GetPaged(ctx context.Context, p models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.BudgetTemplatesPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, bts.rdb, cacheKey, BudgetTemplateCacheTTL, func(ctx context.Context) (models.BudgetTemplatesPagedModel, error) {
		return bts.Rpts.BudgTem.GetPaged(ctx, p)
	}, "budget_template")
}

func (bts BudgetTemplateService) GetDetail(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.BudgetTemplateCacheKeyPrefix)
	return common.FetchWithCache(ctx, bts.rdb, cacheKey, BudgetTemplateCacheTTL, func(ctx context.Context) (models.BudgetTemplateModel, error) {
		return bts.Rpts.BudgTem.GetDetail(ctx, id)
	}, "budget_template")
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template cannot be associated with both account and category")
	}

	template, err := bts.Rpts.BudgTem.Create(ctx, p)
	if err != nil {
		return template, err
	}

	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplateCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	// Strict validation: only allow updating name, note, and active status
	if p.Name == nil && p.Note == nil && p.Active == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("At least one of name, note, or active must be provided")
	}

	template, err := bts.Rpts.BudgTem.Update(ctx, id, p)
	if err != nil {
		return template, err
	}

	common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	return template, nil
}

func (bts BudgetTemplateService) Delete(ctx context.Context, id int64) error {
	return huma.Error405MethodNotAllowed("Budget templates cannot be deleted. Use PATCH to deactivate if you want to pause budget generation.")
}

func (bts BudgetTemplateService) GetRelatedBudgets(ctx context.Context, templateID int64, query models.BudgetTemplateRelatedBudgetsSearchModel) (models.BudgetsPagedModel, error) {
	// Build cache key for related budgets list
	cacheKey := common.BuildCacheKey(templateID, query, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d_budgets_paged:", templateID))
	return common.FetchWithCache(ctx, bts.rdb, cacheKey, BudgetTemplateCacheTTL, func(ctx context.Context) (models.BudgetsPagedModel, error) {
		ids, err := bts.Rpts.BudgTem.GetRelatedBudgets(ctx, templateID, query)
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

		return bts.GetBudgetsPaged(ctx, searchModel)
	}, "budget_template_related")
}

// Budget-related methods (internal use - called by worker and template operations)

// GetBudgetsPaged retrieves generated budgets with optional filtering (internal use)
func (bts BudgetTemplateService) GetBudgetsPaged(ctx context.Context, p models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	cacheKey := common.BuildCacheKey(0, p, constants.BudgetsPagedCacheKeyPrefix)
	return common.FetchWithCache(ctx, bts.rdb, cacheKey, BudgetTemplateCacheTTL, func(ctx context.Context) (models.BudgetsPagedModel, error) {
		return bts.Rpts.BudgTem.GetBudgetsPaged(ctx, p)
	}, "budget")
}

// GetBudgetDetail retrieves a single generated budget with calculated actual amount (internal use)
func (bts BudgetTemplateService) GetBudgetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
	cacheKey := common.BuildCacheKey(id, nil, constants.BudgetCacheKeyPrefix)
	return common.FetchWithCache(ctx, bts.rdb, cacheKey, BudgetTemplateCacheTTL, func(ctx context.Context) (models.BudgetModel, error) {
		return bts.Rpts.BudgTem.GetBudgetDetail(ctx, id)
	}, "budget")
}

// CreateBudget generates a new budget from a template (internal use - called by worker)
func (bts BudgetTemplateService) CreateBudget(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	budget, err := bts.Rpts.BudgTem.CreateBudget(ctx, p)
	if err != nil {
		return budget, err
	}

	// Invalidate all budget caches since a new budget was generated
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
	// Invalidate related budget list caches if template is known
	if p.TemplateID != nil {
		common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplateCacheKeyPrefix+"*_budgets_paged:*")
	}

	return budget, nil
}

// DeactivateExistingActiveBudgets deactivates active budgets for a given account/category/period (internal use - called by worker before creating new budget)
func (bts BudgetTemplateService) DeactivateExistingActiveBudgets(ctx context.Context, accountID, categoryID *int64, periodType string) error {
	err := bts.Rpts.BudgTem.DeactivateExistingActiveBudgets(ctx, accountID, categoryID, periodType)
	if err != nil {
		return err
	}

	// Invalidate all budget caches since we deactivated budgets
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")

	return nil
}
