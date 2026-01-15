package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type SummaryService struct {
	sr repositories.SummaryRepository
}

func NewSummaryService(sr repositories.SummaryRepository) SummaryService {
	return SummaryService{sr}
}

func (ss SummaryService) GetTransactionSummary(ctx context.Context, p models.SummaryTransactionSearchModel) (models.SummaryTransactionListModel, error) {
	return ss.sr.GetTransactionSummary(ctx, p)
}

func (ss SummaryService) GetAccountSummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryAccountListModel, error) {
	return ss.sr.GetAccountSummary(ctx, p)
}

func (ss SummaryService) GetCategorySummary(ctx context.Context, p models.SummarySearchModel) (models.SummaryCategoryListModel, error) {
	return ss.sr.GetCategorySummary(ctx, p)
}
