package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type CategoryService struct {
	cr repositories.CategoryRepository
}

func NewCategoryService(cr repositories.CategoryRepository) CategoryService {
	return CategoryService{
		cr,
	}
}

func (cs CategoryService) List(ctx context.Context, p models.ListCategoriesRequestModel) (models.ListCategoriesResponseModel, error) {
	return cs.cr.List(ctx, p)
}

func (cs CategoryService) Get(ctx context.Context, id int64) (models.CategoryModel, error) {
	return cs.cr.Get(ctx, id)
}

func (cs CategoryService) Create(ctx context.Context, p models.CreateCategoryRequestModel) (models.CreateCategoryResponseModel, error) {
	return cs.cr.Create(ctx, p)
}

func (cs CategoryService) Update(ctx context.Context, id int64, p models.UpdateCategoryRequestModel) (models.UpdateCategoryResponseModel, error) {
	return cs.cr.Update(ctx, id, p)
}

func (cs CategoryService) Delete(ctx context.Context, id int64) error {
	return cs.cr.Delete(ctx, id)
}

func (cs CategoryService) Reorder(ctx context.Context, items []models.ReorderCategoryItemModel) error {
	return cs.cr.Reorder(ctx, items)
}
