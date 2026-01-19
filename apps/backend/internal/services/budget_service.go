package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type BudgetService struct {
	br repositories.BudgetRepository
}

func NewBudgetService(br repositories.BudgetRepository) BudgetService {
	return BudgetService{br}
}

func (bs BudgetService) GetPaged(ctx context.Context, p models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	return bs.br.GetPaged(ctx, p)
}

func (bs BudgetService) GetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
	return bs.br.GetDetail(ctx, id)
}

func (bs BudgetService) Create(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	if p.AccountID == nil && p.CategoryID == nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget must be associated with either an account or category")
	}

	if p.AccountID != nil && p.CategoryID != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Budget cannot be associated with both account and category")
	}

	return bs.br.Create(ctx, p)
}

func (bs BudgetService) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	return bs.br.Update(ctx, id, p)
}

func (bs BudgetService) Delete(ctx context.Context, id int64) error {
	return bs.br.Delete(ctx, id)
}
