package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionTemplateService struct {
	ttr repositories.TransactionTemplateRepository
	tr  repositories.TransactionRepository
}

func NewTransactionTemplateService(ttr repositories.TransactionTemplateRepository, tr repositories.TransactionRepository) TransactionTemplateService {
	return TransactionTemplateService{ttr: ttr, tr: tr}
}

func (tts TransactionTemplateService) GetPaged(ctx context.Context, query models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
	return tts.ttr.GetPaged(ctx, query)
}

func (tts TransactionTemplateService) GetDetail(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	return tts.ttr.GetDetail(ctx, id)
}

func (tts TransactionTemplateService) Create(ctx context.Context, payload models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	return tts.ttr.Create(ctx, payload)
}

func (tts TransactionTemplateService) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	return tts.ttr.Update(ctx, id, payload)
}

func (tts TransactionTemplateService) Delete(ctx context.Context, id int64) error {
	return tts.ttr.Delete(ctx, id)
}

func (tts TransactionTemplateService) GetRelatedTransactions(ctx context.Context, templateID int64, query models.TransactionTemplateRelatedTransactionsSearchModel) (models.TransactionsPagedModel, error) {
	ids, err := tts.ttr.GetRelatedTransactions(ctx, templateID, query)
	if err != nil {
		return models.TransactionsPagedModel{}, err
	}

	if len(ids) == 0 {
		return models.TransactionsPagedModel{
			Items:      []models.TransactionModel{},
			PageNumber: query.PageNumber,
			PageSize:   query.PageSize,
			TotalCount: 0,
			TotalPages: 0,
		}, nil
	}

	var intIDs []int
	for _, id := range ids {
		intIDs = append(intIDs, int(id))
	}

	searchModel := models.TransactionsSearchModel{
		PageNumber:            query.PageNumber,
		PageSize:              query.PageSize,
		SortBy:                query.SortBy,
		SortOrder:             query.SortOrder,
		IDs:                   intIDs,
		Type:                  query.Type,
		AccountIDs:            query.AccountIDs,
		CategoryIDs:           query.CategoryIDs,
		DestinationAccountIDs: query.DestinationAccountIDs,
		TagIDs:                query.TagIDs,
		StartDate:             query.StartDate,
		EndDate:               query.EndDate,
		MinAmount:             query.MinAmount,
		MaxAmount:             query.MaxAmount,
	}

	return tts.tr.GetPaged(ctx, searchModel)
}
