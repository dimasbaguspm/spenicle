package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionRelationService struct {
	trr repositories.TransactionRelationRepository
	tr  repositories.TransactionRepository
}

func NewTransactionRelationService(
	trr repositories.TransactionRelationRepository,
	tr repositories.TransactionRepository,
) TransactionRelationService {
	return TransactionRelationService{trr, tr}
}

func (trs TransactionRelationService) GetPaged(ctx context.Context, q models.TransactionRelationsSearchModel) (models.TransactionRelationsPagedModel, error) {
	return trs.trr.GetPaged(ctx, q)
}

func (trs TransactionRelationService) GetDetail(ctx context.Context, p models.TransactionRelationGetModel) (models.TransactionRelationModel, error) {
	return trs.trr.GetDetail(ctx, p)
}

func (trs TransactionRelationService) Create(ctx context.Context, p models.CreateTransactionRelationModel) (models.TransactionRelationModel, error) {
	return trs.trr.Create(ctx, p)
}

func (trs TransactionRelationService) Delete(ctx context.Context, p models.DeleteTransactionRelationModel) error {
	return trs.trr.Delete(ctx, p)
}
