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

func (bs BudgetService) List(ctx context.Context, p models.ListBudgetsRequestModel) (models.ListBudgetsResponseModel, error) {
	return bs.br.List(ctx, p)
}

func (bs BudgetService) Get(ctx context.Context, id int64) (models.BudgetModel, error) {
	return bs.br.Get(ctx, id)
}

func (bs BudgetService) Create(ctx context.Context, p models.CreateBudgetRequestModel) (models.CreateBudgetResponseModel, error) {
	return bs.br.Create(ctx, p)
}

func (bs BudgetService) Update(ctx context.Context, id int64, p models.UpdateBudgetRequestModel) (models.UpdateBudgetResponseModel, error) {
	return bs.br.Update(ctx, id, p)
}

func (bs BudgetService) Delete(ctx context.Context, id int64) error {
	return bs.br.Delete(ctx, id)
}
