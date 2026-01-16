package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
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

func (cs CategoryService) GetPaged(ctx context.Context, p models.CategoriesSearchModel) (models.CategoriesPagedModel, error) {
	return cs.cr.GetPaged(ctx, p)
}

func (cs CategoryService) GetDetail(ctx context.Context, id int64) (models.CategoryModel, error) {
	return cs.cr.GetDetail(ctx, id)
}

func (cs CategoryService) Create(ctx context.Context, p models.CreateCategoryModel) (models.CategoryModel, error) {
	return cs.cr.Create(ctx, p)
}

func (cs CategoryService) Update(ctx context.Context, id int64, p models.UpdateCategoryModel) (models.CategoryModel, error) {
	return cs.cr.Update(ctx, id, p)
}

func (cs CategoryService) Delete(ctx context.Context, id int64) error {
	tx, err := cs.cr.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := cs.cr.DeleteWithTx(ctx, tx, id); err != nil {
		return err
	}

	ids, err := cs.cr.GetActiveIDsOrderedWithTx(ctx, tx)
	if err != nil {
		return err
	}

	if err := cs.cr.ReorderWithTx(ctx, tx, ids); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit transaction", err)
	}
	tx = nil

	return nil
}

func (cs CategoryService) Reorder(ctx context.Context, p models.ReorderCategoriesModel) error {
	if len(p.Items) == 0 {
		return huma.Error400BadRequest("No category IDs provided for reordering")
	}

	if err := cs.cr.ValidateIDsExist(ctx, p.Items); err != nil {
		return err
	}

	tx, err := cs.cr.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := cs.cr.ReorderWithTx(ctx, tx, p.Items); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit reorder transaction", err)
	}
	tx = nil

	return nil
}
