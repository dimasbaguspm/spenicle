package services

import (
	"context"

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

func (as AccountService) List(ctx context.Context, p models.ListAccountsRequestModel) (models.ListAccountsResponseModel, error) {
	return as.ar.List(ctx, p)
}

func (as AccountService) Get(ctx context.Context, id int64) (models.AccountModel, error) {
	return as.ar.Get(ctx, id)
}

func (as AccountService) Create(ctx context.Context, p models.CreateAccountRequestModel) (models.CreateAccountResponseModel, error) {
	return as.ar.Create(ctx, p)
}

func (as AccountService) Update(ctx context.Context, id int64, p models.UpdateAccountRequestModel) (models.UpdateAccountResponseModel, error) {
	return as.ar.Update(ctx, id, p)
}

func (as AccountService) Delete(ctx context.Context, id int64) error {
	return as.ar.Delete(ctx, id)
}

func (as AccountService) Reorder(ctx context.Context, items []models.ReorderAccountItemModel) error {
	return as.ar.Reorder(ctx, items)
}
