package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type BudgetTemplateService struct {
	btr repositories.BudgetTemplateRepository
	br  repositories.BudgetRepository
}

func NewBudgetTemplateService(btr repositories.BudgetTemplateRepository, br repositories.BudgetRepository) BudgetTemplateService {
	return BudgetTemplateService{btr, br}
}

func (bts BudgetTemplateService) GetPaged(ctx context.Context, p models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
	return bts.btr.GetPaged(ctx, p)
}

func (bts BudgetTemplateService) GetDetail(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	return bts.btr.GetDetail(ctx, id)
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Budget template cannot be associated with both account and category")
	}

	return bts.btr.Create(ctx, p)
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	return bts.btr.Update(ctx, id, p)
}

func (bts BudgetTemplateService) Delete(ctx context.Context, id int64) error {
	return bts.btr.Delete(ctx, id)
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
