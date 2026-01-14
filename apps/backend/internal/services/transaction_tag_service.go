package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionTagService struct {
	repo repositories.TransactionTagRepository
}

func NewTransactionTagService(repo repositories.TransactionTagRepository) TransactionTagService {
	return TransactionTagService{repo}
}

// List delegates to repository
func (tts TransactionTagService) List(ctx context.Context, transactionID int64, pageNumber int, pageSize int) (models.ListTransactionTagsResponseModel, error) {
	return tts.repo.List(ctx, transactionID, pageNumber, pageSize)
}

// Get delegates to repository
func (tts TransactionTagService) Get(ctx context.Context, transactionID int64, tagID int64) (models.TransactionTagModel, error) {
	return tts.repo.Get(ctx, transactionID, tagID)
}

// Create delegates to repository
func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagRequestModel) (models.CreateTransactionTagResponseModel, error) {
	return tts.repo.Create(ctx, payload)
}

// Delete delegates to repository
func (tts TransactionTagService) Delete(ctx context.Context, transactionID int64, tagID int64) error {
	return tts.repo.Delete(ctx, transactionID, tagID)
}

// DeleteByTransactionID delegates to repository
func (tts TransactionTagService) DeleteByTransactionID(ctx context.Context, transactionID int64) error {
	return tts.repo.DeleteByTransactionID(ctx, transactionID)
}

// DeleteByTagID delegates to repository
func (tts TransactionTagService) DeleteByTagID(ctx context.Context, tagID int64) error {
	return tts.repo.DeleteByTagID(ctx, tagID)
}
