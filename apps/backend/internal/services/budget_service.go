package services

import (
	"context"

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
	// ensure that budgets created via service do not have template ID set
	p.TemplateID = nil
	return bs.br.Create(ctx, p)
}

func (bs BudgetService) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	return bs.br.Update(ctx, id, p)
}

func (bs BudgetService) Delete(ctx context.Context, id int64) error {
	return bs.br.Delete(ctx, id)
}
