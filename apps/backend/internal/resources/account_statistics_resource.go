package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type AccountStatisticsResource struct {
	sevs services.RootService
}

// AccStatResource is a shorter alias for AccountStatisticsResource
type AccStatResource = AccountStatisticsResource

func NewAccountStatisticsResource(sevs services.RootService) AccountStatisticsResource {
	return AccountStatisticsResource{sevs}
}

// Routes registers all statistics routes
func (sr AccountStatisticsResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "get-account-statistics",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics",
		Summary:     "Get account statistics",
		Description: "Returns comprehensive statistics for an account including category heatmap, monthly velocity, and time frequency distribution",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetAccountStatistics)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-heatmap",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/category-heatmap",
		Summary:     "Get category spending heatmap",
		Description: "Returns spending distribution by category for the specified time period",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetCategoryHeatmap)

	huma.Register(api, huma.Operation{
		OperationID: "get-monthly-velocity",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/monthly-velocity",
		Summary:     "Get monthly spending velocity",
		Description: "Returns month-over-month spending trends and velocity metrics",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetMonthlyVelocity)

	huma.Register(api, huma.Operation{
		OperationID: "get-time-frequency",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/time-frequency",
		Summary:     "Get transaction time frequency distribution",
		Description: "Returns frequency distribution of transactions (daily, weekly, monthly, irregular)",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetTimeFrequencyHeatmap)

	huma.Register(api, huma.Operation{
		OperationID: "get-cash-flow-pulse",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/cash-flow-pulse",
		Summary:     "Get cash flow balance trend",
		Description: "Returns daily balance trend over the specified period for visualizing cash flow patterns",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetCashFlowPulse)

	huma.Register(api, huma.Operation{
		OperationID: "get-burn-rate",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/burn-rate",
		Summary:     "Get spending burn rate analysis",
		Description: "Returns daily/weekly/monthly average spending and budget projection estimates",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetBurnRate)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget-health",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/statistics/budget-health",
		Summary:     "Get budget health metrics",
		Description: "Returns health status of active and past budgets for this account",
		Tags:        []string{"Statistics"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetBudgetHealth)
}

// GetAccountStatistics returns comprehensive statistics for an account
func (sr AccountStatisticsResource) GetAccountStatistics(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsResponse
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetAccountStatistics", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetAccountStatistics(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success")
	return &struct {
		Body models.AccountStatisticsResponse
	}{
		Body: resp,
	}, nil
}

// GetCategoryHeatmap returns category spending distribution
func (sr AccountStatisticsResource) GetCategoryHeatmap(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsCategoryHeatmapModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetCategoryHeatmap", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetCategoryHeatmap(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "category_count", resp.CategoryCount)
	return &struct {
		Body models.AccountStatisticsCategoryHeatmapModel
	}{
		Body: resp,
	}, nil
}

// GetMonthlyVelocity returns monthly spending trends
func (sr AccountStatisticsResource) GetMonthlyVelocity(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsMonthlyVelocityModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetMonthlyVelocity", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetMonthlyVelocity(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "months", len(resp.Data))
	return &struct {
		Body models.AccountStatisticsMonthlyVelocityModel
	}{
		Body: resp,
	}, nil
}

// GetTimeFrequencyHeatmap returns transaction frequency distribution
func (sr AccountStatisticsResource) GetTimeFrequencyHeatmap(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsTimeFrequencyHeatmapModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetTimeFrequencyHeatmap", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetTimeFrequencyHeatmap(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "total_transactions", resp.TotalTransactions)
	return &struct {
		Body models.AccountStatisticsTimeFrequencyHeatmapModel
	}{
		Body: resp,
	}, nil
}

// GetCashFlowPulse returns daily balance trend
func (sr AccountStatisticsResource) GetCashFlowPulse(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsCashFlowPulseModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetCashFlowPulse", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetCashFlowPulse(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "data_points", len(resp.Data), "ending_balance", resp.EndingBalance)
	return &struct {
		Body models.AccountStatisticsCashFlowPulseModel
	}{
		Body: resp,
	}, nil
}

// GetBurnRate returns spending burn rate analysis
func (sr AccountStatisticsResource) GetBurnRate(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsBurnRateModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetBurnRate", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetBurnRate(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "daily_average", resp.DailyAverageSpend, "budget_status", resp.BudgetLimitStatus)
	return &struct {
		Body models.AccountStatisticsBurnRateModel
	}{
		Body: resp,
	}, nil
}

// GetBudgetHealth returns budget health metrics
func (sr AccountStatisticsResource) GetBudgetHealth(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	models.AccountStatisticsSearchModel
}) (*struct {
	Body models.AccountStatisticsBudgetHealthModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AccountStatisticsResource.GetBudgetHealth", "account_id", input.ID)
	logger.Info("start")

	resp, err := sr.sevs.AccStat.GetBudgetHealth(ctx, input.ID, input.AccountStatisticsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "active_budgets", len(resp.ActiveBudgets), "past_budgets", len(resp.PastBudgets))
	return &struct {
		Body models.AccountStatisticsBudgetHealthModel
	}{
		Body: resp,
	}, nil
}
