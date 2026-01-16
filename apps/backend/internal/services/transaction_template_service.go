package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionTemplateService struct {
	repo repositories.TransactionTemplateRepository
}

func NewTransactionTemplateService(repo repositories.TransactionTemplateRepository) TransactionTemplateService {
	return TransactionTemplateService{repo}
}

func (tts TransactionTemplateService) GetPaged(ctx context.Context, query models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
	return tts.repo.GetPaged(ctx, query)
}

func (tts TransactionTemplateService) GetDetail(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	return tts.repo.GetDetail(ctx, id)
}

func (tts TransactionTemplateService) Create(ctx context.Context, payload models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	return tts.repo.Create(ctx, payload)
}

func (tts TransactionTemplateService) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	return tts.repo.Update(ctx, id, payload)
}

func (tts TransactionTemplateService) Delete(ctx context.Context, id int64) error {
	return tts.repo.Delete(ctx, id)
}
