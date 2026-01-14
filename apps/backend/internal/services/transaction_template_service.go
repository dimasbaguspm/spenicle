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

// List delegates to repository
func (tts TransactionTemplateService) List(ctx context.Context, query models.ListTransactionTemplatesRequestModel) (models.ListTransactionTemplatesResponseModel, error) {
	return tts.repo.List(ctx, query)
}

// Get delegates to repository
func (tts TransactionTemplateService) Get(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	return tts.repo.Get(ctx, id)
}

// Create delegates to repository
func (tts TransactionTemplateService) Create(ctx context.Context, payload models.CreateTransactionTemplateRequestModel) (models.CreateTransactionTemplateResponseModel, error) {
	return tts.repo.Create(ctx, payload)
}

// Update delegates to repository
func (tts TransactionTemplateService) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateRequestModel) (models.UpdateTransactionTemplateResponseModel, error) {
	return tts.repo.Update(ctx, id, payload)
}

// Delete delegates to repository
func (tts TransactionTemplateService) Delete(ctx context.Context, id int64) error {
	return tts.repo.Delete(ctx, id)
}
