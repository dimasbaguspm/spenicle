package resources

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type CategoryStatisticsResource struct {
	sevs services.RootService
}

// CatStatResource is a shorter alias for CategoryStatisticsResource
type CatStatResource = CategoryStatisticsResource

func NewCategoryStatisticsResource(sevs services.RootService) CategoryStatisticsResource {
	return CategoryStatisticsResource{sevs}
}

// Routes registers all category statistics routes
func (sr CategoryStatisticsResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "get-category-statistics",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics",
		Summary:     "Get comprehensive category statistics",
		Description: "Returns all lifestyle spending metrics for a category including spending velocity, account distribution, average transaction size, day-of-week patterns, and budget utilization",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetCategoryStatistics)

	huma.Register(api, huma.Operation{
		OperationID: "get-spending-velocity",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics/spending-velocity",
		Summary:     "Get category spending velocity trend",
		Description: "Returns monthly spending trend over the specified period (line chart data)",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetSpendingVelocity)

	huma.Register(api, huma.Operation{
		OperationID: "get-account-distribution",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics/account-distribution",
		Summary:     "Get account distribution for category",
		Description: "Returns which accounts pay for this category (donut chart data)",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetAccountDistribution)

	huma.Register(api, huma.Operation{
		OperationID: "get-average-transaction-size",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics/average-transaction-size",
		Summary:     "Get average transaction size for category",
		Description: "Returns typical transaction amounts, including min, max, median, and average",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetAverageTransactionSize)

	huma.Register(api, huma.Operation{
		OperationID: "get-day-of-week-pattern",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics/day-of-week-pattern",
		Summary:     "Get day-of-week spending pattern for category",
		Description: "Returns spending patterns by day of week to show behavioral patterns",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetDayOfWeekPattern)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget-utilization",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/statistics/budget-utilization",
		Summary:     "Get budget utilization for category",
		Description: "Returns budget progress and remaining amounts for active budgets tied to this category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, sr.GetBudgetUtilization)
}

// GetCategoryStatistics handles comprehensive category statistics request
func (sr CategoryStatisticsResource) GetCategoryStatistics(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticsResponse
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetCategoryStatistics", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetCategoryStatistics(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success")
	return &struct {
		Body models.CategoryStatisticsResponse
	}{Body: data}, nil
}

// GetSpendingVelocity handles spending velocity request
func (sr CategoryStatisticsResource) GetSpendingVelocity(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticSpendingVelocityModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetSpendingVelocity", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetSpendingVelocity(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "months", len(data.Data))
	return &struct {
		Body models.CategoryStatisticSpendingVelocityModel
	}{Body: data}, nil
}

// GetAccountDistribution handles account distribution request
func (sr CategoryStatisticsResource) GetAccountDistribution(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticAccountDistributionModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetAccountDistribution", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetAccountDistribution(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "accounts", len(data.Accounts), "total_spending", data.TotalSpending)
	return &struct {
		Body models.CategoryStatisticAccountDistributionModel
	}{Body: data}, nil
}

// GetAverageTransactionSize handles average transaction size request
func (sr CategoryStatisticsResource) GetAverageTransactionSize(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticAverageTransactionSizeModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetAverageTransactionSize", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetAverageTransactionSize(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "transaction_count", data.TransactionCount, "average_amount", data.AverageAmount)
	return &struct {
		Body models.CategoryStatisticAverageTransactionSizeModel
	}{Body: data}, nil
}

// GetDayOfWeekPattern handles day of week pattern request
func (sr CategoryStatisticsResource) GetDayOfWeekPattern(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticDayOfWeekPatternModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetDayOfWeekPattern", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetDayOfWeekPattern(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "days", len(data.Data))
	return &struct {
		Body models.CategoryStatisticDayOfWeekPatternModel
	}{Body: data}, nil
}

// GetBudgetUtilization handles budget utilization request
func (sr CategoryStatisticsResource) GetBudgetUtilization(ctx context.Context, input *struct {
	ID        int64  `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	StartDate string `query:"startDate" doc:"Start date for filtering (ISO 8601 format)" example:"2024-01-01T00:00:00Z" required:"true" format:"date-time"`
	EndDate   string `query:"endDate" doc:"End date for filtering (ISO 8601 format)" example:"2024-12-31T23:59:59Z" required:"true" format:"date-time"`
}) (*struct {
	Body models.CategoryStatisticBudgetUtilizationModel
}, error) {
	logger := middleware.GetLogger(ctx).With("resource", "CategoryStatisticsResource.GetBudgetUtilization", "category_id", input.ID)
	logger.Info("start")

	// Validate category exists
	_, err := sr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, huma.Error404NotFound("Category not found")
	}

	params, err := parseStatisticsParams(input.StartDate, input.EndDate)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	data, err := sr.sevs.CatStat.GetBudgetUtilization(ctx, input.ID, params)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}

	logger.Info("success", "budgets", len(data.Budgets))
	return &struct {
		Body models.CategoryStatisticBudgetUtilizationModel
	}{Body: data}, nil
}

// parseStatisticsParams converts string dates to models.CategoryStatisticsSearchModel
func parseStatisticsParams(startDateStr, endDateStr string) (models.CategoryStatisticsSearchModel, error) {
	startDate, err := time.Parse(time.RFC3339, startDateStr)
	if err != nil {
		return models.CategoryStatisticsSearchModel{}, huma.Error400BadRequest("Invalid startDate format: %v", err)
	}

	endDate, err := time.Parse(time.RFC3339, endDateStr)
	if err != nil {
		return models.CategoryStatisticsSearchModel{}, huma.Error400BadRequest("Invalid endDate format: %v", err)
	}

	return models.CategoryStatisticsSearchModel{
		StartDate: startDate,
		EndDate:   endDate,
	}, nil
}
