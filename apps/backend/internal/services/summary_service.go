package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

// SummaryStore defines the interface for summary repository operations
type SummaryStore interface {
	GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error)
	GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error)
	GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error)
	GetAccountTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error)
	GetCategoryTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error)
	GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error)
}

type SummaryService struct {
	summaryStore SummaryStore
}

func NewSummaryService(summaryStore SummaryStore) *SummaryService {
	return &SummaryService{
		summaryStore: summaryStore,
	}
}

// GetTransactionSummary returns transaction summary grouped by frequency
func (s *SummaryService) GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error) {
	// Set default frequency if not provided
	if params.Frequency == "" {
		params.Frequency = "monthly"
	}

	return s.summaryStore.GetTransactionSummary(ctx, params)
}

// GetAccountSummary returns transaction summary grouped by account
func (s *SummaryService) GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error) {
	return s.summaryStore.GetAccountSummary(ctx, params)
}

// GetCategorySummary returns transaction summary grouped by category
func (s *SummaryService) GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error) {
	return s.summaryStore.GetCategorySummary(ctx, params)
}

// GetAllSummaries returns all three summaries concurrently using goroutines and channels
// This is useful when you need all summary data at once
func (s *SummaryService) GetAllSummaries(ctx context.Context, transactionParams schemas.SummaryTransactionParamModel, accountParams schemas.SummaryParamModel, categoryParams schemas.SummaryParamModel) (schemas.SummaryTransactionSchema, schemas.SummaryAccountSchema, schemas.SummaryCategorySchema, error) {
	type transactionResult struct {
		data schemas.SummaryTransactionSchema
		err  error
	}
	type accountResult struct {
		data schemas.SummaryAccountSchema
		err  error
	}
	type categoryResult struct {
		data schemas.SummaryCategorySchema
		err  error
	}

	transactionCh := make(chan transactionResult, 1)
	accountCh := make(chan accountResult, 1)
	categoryCh := make(chan categoryResult, 1)

	// Fetch transaction summary concurrently
	go func() {
		data, err := s.GetTransactionSummary(ctx, transactionParams)
		transactionCh <- transactionResult{data: data, err: err}
	}()

	// Fetch account summary concurrently
	go func() {
		data, err := s.GetAccountSummary(ctx, accountParams)
		accountCh <- accountResult{data: data, err: err}
	}()

	// Fetch category summary concurrently
	go func() {
		data, err := s.GetCategorySummary(ctx, categoryParams)
		categoryCh <- categoryResult{data: data, err: err}
	}()

	// Wait for all results
	transactionRes := <-transactionCh
	accountRes := <-accountCh
	categoryRes := <-categoryCh

	// Check for errors (return first error encountered)
	if transactionRes.err != nil {
		return schemas.SummaryTransactionSchema{}, schemas.SummaryAccountSchema{}, schemas.SummaryCategorySchema{}, transactionRes.err
	}
	if accountRes.err != nil {
		return schemas.SummaryTransactionSchema{}, schemas.SummaryAccountSchema{}, schemas.SummaryCategorySchema{}, accountRes.err
	}
	if categoryRes.err != nil {
		return schemas.SummaryTransactionSchema{}, schemas.SummaryAccountSchema{}, schemas.SummaryCategorySchema{}, categoryRes.err
	}

	return transactionRes.data, accountRes.data, categoryRes.data, nil
}

// GetAccountTrend returns trend analysis for accounts
func (s *SummaryService) GetAccountTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error) {
	// Set default frequency if not provided
	if params.Frequency == "" {
		params.Frequency = "monthly"
	}

	return s.summaryStore.GetAccountTrend(ctx, params)
}

// GetCategoryTrend returns trend analysis for categories
func (s *SummaryService) GetCategoryTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error) {
	// Set default frequency if not provided
	if params.Frequency == "" {
		params.Frequency = "monthly"
	}

	return s.summaryStore.GetCategoryTrend(ctx, params)
}

// GetTagSummary returns aggregated transaction data grouped by tags
func (s *SummaryService) GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error) {
	return s.summaryStore.GetTagSummary(ctx, params)
}
