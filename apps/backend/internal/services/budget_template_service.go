package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type BudgetTemplateService struct {
	btr repositories.BudgetTemplateRepository
}

func NewBudgetTemplateService(btr repositories.BudgetTemplateRepository) BudgetTemplateService {
	return BudgetTemplateService{btr}
}

func (bts BudgetTemplateService) List(ctx context.Context, p models.ListBudgetTemplatesRequestModel) (models.ListBudgetTemplatesResponseModel, error) {
	return bts.btr.List(ctx, p)
}

func (bts BudgetTemplateService) Get(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	return bts.btr.Get(ctx, id)
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateRequestModel) (models.CreateBudgetTemplateResponseModel, error) {
	return bts.btr.Create(ctx, p)
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateRequestModel) (models.UpdateBudgetTemplateResponseModel, error) {
	return bts.btr.Update(ctx, id, p)
}

func (bts BudgetTemplateService) Delete(ctx context.Context, id int64) error {
	return bts.btr.Delete(ctx, id)
}
