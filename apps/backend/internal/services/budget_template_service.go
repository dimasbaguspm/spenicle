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

// ValidateBudgetBelongsToTemplate checks that a budget exists and belongs to the specified template
func (bts BudgetTemplateService) ValidateBudgetBelongsToTemplate(ctx context.Context, templateID, budgetID int64) error {
	// Check if template exists
	_, err := bts.GetDetail(ctx, templateID)
	if err != nil {
		return huma.Error404NotFound("Budget template not found")
	}

	// Check if budget exists
	budget, err := bts.Rpts.BudgTem.GetBudgetDetail(ctx, budgetID)
	if err != nil {
		return huma.Error404NotFound("Budget not found")
	}

	// Check if budget belongs to template using the budget_template_relations table
	relations, err := bts.Rpts.BudgTem.GetRelatedBudgets(ctx, templateID, models.BudgetTemplateRelatedBudgetsSearchModel{})
	if err != nil {
		return err
	}

	for _, relatedID := range relations {
		if relatedID == budget.ID {
			return nil
		}
	}

	return huma.Error404NotFound("Budget does not belong to this template")
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template cannot be associated with both account and category")
	}

	// Validate uniqueness - applies to ALL templates (active and inactive)
	if err := bts.Rpts.BudgTem.ValidateUniqueBudgetTemplate(ctx, p.AccountID, p.CategoryID, nil); err != nil {
		return models.BudgetTemplateModel{}, err
	}

	template, err := bts.Rpts.BudgTem.Create(ctx, p)
	if err != nil {
		return template, err
	}

	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplateCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")

	// Generate initial budget immediately if the template is due today
	if bts.isTemplateDueNow(template) {
		if _, err := bts.GenerateBudgetFromTemplate(ctx, template); err != nil {
			// Log but don't fail the creation — the worker will pick it up later
			fmt.Printf("budget_template_service: failed to generate immediate budget for template %d: %v\n", template.ID, err)
		}
	}

	return template, nil
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	// Strict validation: only allow updating name, note, active status, and amountLimit
	if p.Name == nil && p.Note == nil && p.Active == nil && p.AmountLimit == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("At least one of name, note, active, or amountLimit must be provided")
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

	// Invalidate account and category caches since a new active budget may appear in their responses
	common.InvalidateCache(ctx, bts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

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

	// Invalidate account and category caches since active budget status affects their responses
	common.InvalidateCache(ctx, bts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

	return nil
}

// GenerateBudgetFromTemplate creates a budget from a template, handling the full lifecycle:
// deactivate existing budgets, create the new budget, create the relation, update execution timestamps, and invalidate caches.
func (bts BudgetTemplateService) GenerateBudgetFromTemplate(ctx context.Context, template models.BudgetTemplateModel) (models.BudgetModel, error) {
	periodStart, periodEnd := CalculateBudgetPeriod(template.Recurrence)
	periodType := CalculatePeriodType(periodStart, periodEnd)

	// For recurring templates, deactivate any existing active budgets for the same account/category/period type
	if template.Recurrence != "none" {
		if err := bts.DeactivateExistingActiveBudgets(ctx, template.AccountID, template.CategoryID, periodType); err != nil {
			return models.BudgetModel{}, fmt.Errorf("failed to deactivate existing budgets: %w", err)
		}
	}

	budgetRequest := models.CreateBudgetModel{
		TemplateID:  &template.ID,
		AccountID:   template.AccountID,
		CategoryID:  template.CategoryID,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		AmountLimit: template.AmountLimit,
		Name:        fmt.Sprintf("%s (%s)", template.Name, periodStart.Format("2006-01-02")),
		Note:        template.Note,
	}

	budget, err := bts.CreateBudget(ctx, budgetRequest)
	if err != nil {
		return models.BudgetModel{}, fmt.Errorf("failed to create budget: %w", err)
	}

	// Create budget-template relation
	if err := bts.Rpts.BudgTem.CreateRelation(ctx, budget.ID, template.ID); err != nil {
		return budget, fmt.Errorf("failed to create relation: %w", err)
	}

	// Update last_executed_at and next_run_at
	if err := bts.Rpts.BudgTem.UpdateLastExecuted(ctx, template.ID); err != nil {
		return budget, fmt.Errorf("failed to update execution time: %w", err)
	}

	// Invalidate template caches after updating execution timestamps
	common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", template.ID))
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d_budgets_paged:*", template.ID))

	return budget, nil
}

// UpdateBudget updates an individual budget's amountLimit (public API method)
// This ONLY affects the specific budget, NOT the template or future budgets
func (bts BudgetTemplateService) UpdateBudget(ctx context.Context, id int64, p models.UpdateBudgetRequestModel) (models.BudgetModel, error) {
	if p.AmountLimit == nil {
		return models.BudgetModel{}, huma.Error400BadRequest("AmountLimit must be provided")
	}

	// Convert public model to internal model
	internalUpdate := models.UpdateBudgetModel{
		AmountLimit: p.AmountLimit,
	}

	budget, err := bts.Rpts.BudgTem.UpdateBudget(ctx, id, internalUpdate)
	if err != nil {
		return budget, err
	}

	// Invalidate caches
	common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetCacheKeyPrefix+"%d", id))
	common.InvalidateCache(ctx, bts.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")

	if budget.TemplateID != nil {
		common.InvalidateCache(ctx, bts.rdb, fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d_budgets_paged:*", *budget.TemplateID))
	}

	// Invalidate account and category caches since budgets are embedded in their responses
	common.InvalidateCache(ctx, bts.rdb, constants.AccountCacheKeyPrefix+"*")
	common.InvalidateCache(ctx, bts.rdb, constants.CategoriesPagedCacheKeyPrefix+"*")

	return budget, nil
}

// isTemplateDueNow checks if a template should generate a budget immediately
func (bts BudgetTemplateService) isTemplateDueNow(template models.BudgetTemplateModel) bool {
	if !template.Active {
		return false
	}
	if template.Recurrence == "none" {
		return false
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startDate := time.Date(template.StartDate.Year(), template.StartDate.Month(), template.StartDate.Day(), 0, 0, 0, 0, template.StartDate.Location())

	if startDate.After(today) {
		return false
	}
	if template.EndDate != nil {
		endDate := time.Date(template.EndDate.Year(), template.EndDate.Month(), template.EndDate.Day(), 0, 0, 0, 0, template.EndDate.Location())
		if endDate.Before(today) {
			return false
		}
	}
	return true
}

// CalculateBudgetPeriod calculates the budget period start and end dates based on the recurrence pattern
func CalculateBudgetPeriod(recurrence string) (time.Time, time.Time) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch recurrence {
	case "weekly":
		daysFromMonday := int((today.Weekday() - time.Monday + 7) % 7)
		weekStart := today.AddDate(0, 0, -daysFromMonday)
		weekEnd := weekStart.AddDate(0, 0, 6)
		return weekStart, weekEnd

	case "monthly":
		monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())
		monthEnd := monthStart.AddDate(0, 1, -1)
		return monthStart, monthEnd

	case "yearly":
		yearStart := time.Date(today.Year(), time.January, 1, 0, 0, 0, 0, today.Location())
		yearEnd := time.Date(today.Year(), time.December, 31, 0, 0, 0, 0, today.Location())
		return yearStart, yearEnd

	default:
		return today, today
	}
}

// CalculatePeriodType determines the period type based on start and end dates
func CalculatePeriodType(start, end time.Time) string {
	duration := end.Sub(start)
	days := int(duration.Hours()/24) + 1 // +1 to include both start and end dates

	if days == 7 {
		return "weekly"
	}
	if days >= 28 && days <= 31 {
		return "monthly"
	}
	if days >= 365 && days <= 366 {
		return "yearly"
	}
	return "custom"
}
