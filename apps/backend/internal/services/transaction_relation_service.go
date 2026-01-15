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

// List retrieves transaction relations for a specific transaction
func (trs TransactionRelationService) List(ctx context.Context, transactionID int64, pageNumber, pageSize int) (models.ListTransactionRelationsResponseModel, error) {
	_, err := trs.tr.GetDetail(ctx, transactionID)
	if err != nil {
		return models.ListTransactionRelationsResponseModel{}, err
	}

	return trs.trr.List(ctx, transactionID, pageNumber, pageSize)
}

// Get retrieves a single transaction relation
func (trs TransactionRelationService) Get(ctx context.Context, id int64) (models.TransactionRelationModel, error) {
	return trs.trr.Get(ctx, id)
}

// Create creates a new transaction relation
func (trs TransactionRelationService) Create(ctx context.Context, p models.CreateTransactionRelationRequestModel) (models.CreateTransactionRelationResponseModel, error) {
	return trs.trr.Create(ctx, p)
}

// Delete deletes a transaction relation
func (trs TransactionRelationService) Delete(ctx context.Context, id int64) error {
	return trs.trr.Delete(ctx, id)
}

// DeleteByTransactionIDs deletes a relation between two transactions
func (trs TransactionRelationService) DeleteByTransactionIDs(ctx context.Context, transactionID, relatedTransactionID int64) error {
	return trs.trr.DeleteByTransactionIDs(ctx, transactionID, relatedTransactionID)
}
