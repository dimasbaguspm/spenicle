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

func (bts BudgetTemplateService) GetPaged(ctx context.Context, p models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
	return bts.btr.GetPaged(ctx, p)
}

func (bts BudgetTemplateService) GetDetail(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	return bts.btr.GetDetail(ctx, id)
}

func (bts BudgetTemplateService) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	return bts.btr.Create(ctx, p)
}

func (bts BudgetTemplateService) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	return bts.btr.Update(ctx, id, p)
}

func (bts BudgetTemplateService) Delete(ctx context.Context, id int64) error {
	return bts.btr.Delete(ctx, id)
}
