package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

// SummaryService defines the interface for summary business logic operations.
// This allows the resource to be tested with mock implementations.
type SummaryService interface {
	GetTransactionSummary(ctx context.Context, params schemas.SummaryTransactionParamModel) (schemas.SummaryTransactionSchema, error)
	GetAccountSummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryAccountSchema, error)
	GetCategorySummary(ctx context.Context, params schemas.SummaryParamModel) (schemas.SummaryCategorySchema, error)
	GetAccountTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.AccountTrendSchema, error)
	GetCategoryTrend(ctx context.Context, params schemas.TrendParamSchema) (schemas.CategoryTrendSchema, error)
}

type SummaryResource struct {
	service SummaryService
}

func NewSummaryResource(service SummaryService) *SummaryResource {
	return &SummaryResource{service: service}
}

// RegisterRoutes registers all summary routes (all protected with authentication)
func (r *SummaryResource) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction-summary",
		Method:      http.MethodGet,
		Path:        "/summary/transactions",
		Summary:     "Get transaction summary",
		Description: "Returns transaction summary grouped by frequency (daily, weekly, monthly, yearly) with optional date filtering",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.GetTransactionSummary)

	huma.Register(api, huma.Operation{
		OperationID: "get-account-summary",
		Method:      http.MethodGet,
		Path:        "/summary/accounts",
		Summary:     "Get account summary",
		Description: "Returns transaction summary grouped by account with optional date filtering",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.GetAccountSummary)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-summary",
		Method:      http.MethodGet,
		Path:        "/summary/categories",
		Summary:     "Get category summary",
		Description: "Returns transaction summary grouped by category with optional date filtering",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.GetCategorySummary)

	huma.Register(api, huma.Operation{
		OperationID: "get-account-trends",
		Method:      http.MethodGet,
		Path:        "/summary/accounts/trends",
		Summary:     "Get account spending trends",
		Description: "Returns trend analysis for accounts showing if spending is increasing or decreasing over time, grouped by frequency (weekly, monthly)",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.GetAccountTrends)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-trends",
		Method:      http.MethodGet,
		Path:        "/summary/categories/trends",
		Summary:     "Get category spending trends",
		Description: "Returns trend analysis for categories showing if spending is increasing or decreasing over time, grouped by frequency (weekly, monthly)",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.GetCategoryTrends)
}

type GetTransactionSummaryInput struct {
	schemas.SummaryTransactionParamModel
}

type GetTransactionSummaryOutput struct {
	Body schemas.SummaryTransactionSchema
}

func (r *SummaryResource) GetTransactionSummary(ctx context.Context, input *GetTransactionSummaryInput) (*GetTransactionSummaryOutput, error) {
	result, err := r.service.GetTransactionSummary(ctx, input.SummaryTransactionParamModel)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get transaction summary", err)
	}

	return &GetTransactionSummaryOutput{Body: result}, nil
}

type GetAccountSummaryInput struct {
	schemas.SummaryParamModel
}

type GetAccountSummaryOutput struct {
	Body schemas.SummaryAccountSchema
}

func (r *SummaryResource) GetAccountSummary(ctx context.Context, input *GetAccountSummaryInput) (*GetAccountSummaryOutput, error) {
	result, err := r.service.GetAccountSummary(ctx, input.SummaryParamModel)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get account summary", err)
	}

	return &GetAccountSummaryOutput{Body: result}, nil
}

type GetCategorySummaryInput struct {
	schemas.SummaryParamModel
}

type GetCategorySummaryOutput struct {
	Body schemas.SummaryCategorySchema
}

func (r *SummaryResource) GetCategorySummary(ctx context.Context, input *GetCategorySummaryInput) (*GetCategorySummaryOutput, error) {
	result, err := r.service.GetCategorySummary(ctx, input.SummaryParamModel)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get category summary", err)
	}

	return &GetCategorySummaryOutput{Body: result}, nil
}

type GetAccountTrendsInput struct {
	schemas.TrendParamSchema
}

type GetAccountTrendsOutput struct {
	Body schemas.AccountTrendSchema
}

func (r *SummaryResource) GetAccountTrends(ctx context.Context, input *GetAccountTrendsInput) (*GetAccountTrendsOutput, error) {
	result, err := r.service.GetAccountTrend(ctx, input.TrendParamSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get account trends", err)
	}

	return &GetAccountTrendsOutput{Body: result}, nil
}

type GetCategoryTrendsInput struct {
	schemas.TrendParamSchema
}

type GetCategoryTrendsOutput struct {
	Body schemas.CategoryTrendSchema
}

func (r *SummaryResource) GetCategoryTrends(ctx context.Context, input *GetCategoryTrendsInput) (*GetCategoryTrendsOutput, error) {
	result, err := r.service.GetCategoryTrend(ctx, input.TrendParamSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get category trends", err)
	}

	return &GetCategoryTrendsOutput{Body: result}, nil
}
