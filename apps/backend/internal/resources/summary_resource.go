package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type SummaryResource struct {
	service services.SummaryService
}

func NewSummaryResource(service services.SummaryService) SummaryResource {
	return SummaryResource{service}
}

// Routes registers all summary routes
func (sr SummaryResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction-summary",
		Method:      http.MethodGet,
		Path:        "/summary/transactions",
		Summary:     "Get transaction summary",
		Description: "Returns transaction summary grouped by frequency (daily, weekly, monthly, yearly)",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetTransactionSummary)

	huma.Register(api, huma.Operation{
		OperationID: "get-account-summary",
		Method:      http.MethodGet,
		Path:        "/summary/accounts",
		Summary:     "Get account summary",
		Description: "Returns transaction summary grouped by account",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetAccountSummary)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-summary",
		Method:      http.MethodGet,
		Path:        "/summary/categories",
		Summary:     "Get category summary",
		Description: "Returns transaction summary grouped by category",
		Tags:        []string{"Summary"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetCategorySummary)
}

func (sr SummaryResource) GetTransactionSummary(ctx context.Context, input *struct {
	models.SummaryTransactionSearchModel
}) (*struct {
	Body models.SummaryTransactionListModel
}, error) {
	resp, err := sr.service.GetTransactionSummary(ctx, input.SummaryTransactionSearchModel)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.SummaryTransactionListModel
	}{
		Body: resp,
	}, nil
}

func (sr SummaryResource) GetAccountSummary(ctx context.Context, input *struct {
	models.SummarySearchModel
}) (*struct {
	Body models.SummaryAccountListModel
}, error) {
	resp, err := sr.service.GetAccountSummary(ctx, input.SummarySearchModel)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.SummaryAccountListModel
	}{
		Body: resp,
	}, nil
}

func (sr SummaryResource) GetCategorySummary(ctx context.Context, input *struct {
	models.SummarySearchModel
}) (*struct {
	Body models.SummaryCategoryListModel
}, error) {
	resp, err := sr.service.GetCategorySummary(ctx, input.SummarySearchModel)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.SummaryCategoryListModel
	}{
		Body: resp,
	}, nil
}
