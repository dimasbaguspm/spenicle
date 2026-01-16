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

func (tts TransactionTagService) GetPaged(ctx context.Context, q models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	return tts.repo.GetPaged(ctx, q)
}

func (tts TransactionTagService) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	return tts.repo.GetDetail(ctx, ID)
}

func (tts TransactionTagService) Create(ctx context.Context, payload models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	return tts.repo.Create(ctx, payload)
}

func (tts TransactionTagService) Delete(ctx context.Context, ID int64) error {
	return tts.repo.Delete(ctx, ID)
}
