package services

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type AccountService struct {
	ar repositories.AccountRepository
}

func NewAccountService(ar repositories.AccountRepository) AccountService {
	return AccountService{
		ar,
	}
}

func (as AccountService) GetPaged(ctx context.Context, p models.AccountsSearchModel) (models.AccountsPagedModel, error) {
	return as.ar.GetPaged(ctx, p)
}

func (as AccountService) GetDetail(ctx context.Context, id int64) (models.AccountModel, error) {
	return as.ar.GetDetail(ctx, id)
}

func (as AccountService) Create(ctx context.Context, p models.CreateAccountModel) (models.AccountModel, error) {
	return as.ar.Create(ctx, p)
}

func (as AccountService) Update(ctx context.Context, id int64, p models.UpdateAccountModel) (models.AccountModel, error) {
	return as.ar.Update(ctx, id, p)
}

func (as AccountService) Delete(ctx context.Context, id int64) error {
	tx, err := as.ar.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := as.ar.DeleteWithTx(ctx, tx, id); err != nil {
		return err
	}

	ids, err := as.ar.GetActiveIDsOrderedWithTx(ctx, tx)
	if err != nil {
		return err
	}

	if err := as.ar.ReorderWithTx(ctx, tx, ids); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit transaction", err)
	}
	tx = nil

	return nil
}

func (as AccountService) Reorder(ctx context.Context, p models.ReorderAccountsModel) error {
	if len(p.Data) == 0 {
		return huma.Error400BadRequest("No account IDs provided for reordering")
	}

	if err := as.ar.ValidateIDsExist(ctx, p.Data); err != nil {
		return err
	}

	tx, err := as.ar.Pgx.Begin(ctx)
	if err != nil {
		return huma.Error400BadRequest("Unable to start transaction", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err := as.ar.ReorderWithTx(ctx, tx, p.Data); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error400BadRequest("Unable to commit reorder transaction", err)
	}
	tx = nil

	return nil
}
