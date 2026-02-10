package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

type CategoryStatisticsService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

// CatStatService is a shorter alias for CategoryStatisticsService
type CatStatService = CategoryStatisticsService

func NewCategoryStatisticsService(rpts *repositories.RootRepository, rdb *redis.Client) CategoryStatisticsService {
	return CategoryStatisticsService{rpts, rdb}
}

// GetCategoryStatistics returns comprehensive statistics for a category within a time period
func (ss CategoryStatisticsService) GetCategoryStatistics(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticsResponse, error) {
	// Use errgroup for cleaner goroutine coordination
	eg, egCtx := errgroup.WithContext(ctx)

	// Allocate variables for results
	var velocity models.CategoryStatisticSpendingVelocityModel
	var distribution models.CategoryStatisticAccountDistributionModel
	var avgSize models.CategoryStatisticAverageTransactionSizeModel
	var dayPattern models.CategoryStatisticDayOfWeekPatternModel
	var budget models.CategoryStatisticBudgetUtilizationModel

	// Launch all statistics fetches in parallel
	eg.Go(func() error {
		data, err := ss.GetSpendingVelocity(egCtx, categoryID, p)
		velocity = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetAccountDistribution(egCtx, categoryID, p)
		distribution = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetAverageTransactionSize(egCtx, categoryID, p)
		avgSize = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetDayOfWeekPattern(egCtx, categoryID, p)
		dayPattern = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetBudgetUtilization(egCtx, categoryID, p)
		budget = data
		return err
	})

	// Wait for all goroutines to complete
	if err := eg.Wait(); err != nil {
		return models.CategoryStatisticsResponse{}, err
	}

	return models.CategoryStatisticsResponse{
		SpendingVelocity:       velocity,
		AccountDistribution:    distribution,
		AverageTransactionSize: avgSize,
		DayOfWeekPattern:       dayPattern,
		BudgetUtilization:      budget,
	}, nil
}

// GetSpendingVelocity returns spending trend with Redis caching
func (ss CategoryStatisticsService) GetSpendingVelocity(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticSpendingVelocityModel, error) {
	cacheKey := common.BuildStatisticsCacheKey(constants.EntityCategory, categoryID, constants.CategoryStatisticsSpendingVelocitySuffix, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLStatistics, func(ctx context.Context) (models.CategoryStatisticSpendingVelocityModel, error) {
		return ss.rpts.CatStat.GetSpendingVelocity(ctx, categoryID, p)
	}, "category_statistics")
}

// GetAccountDistribution returns account distribution with Redis caching
func (ss CategoryStatisticsService) GetAccountDistribution(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAccountDistributionModel, error) {
	cacheKey := common.BuildStatisticsCacheKey(constants.EntityCategory, categoryID, constants.CategoryStatisticsAccountDistributionSuffix, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLStatistics, func(ctx context.Context) (models.CategoryStatisticAccountDistributionModel, error) {
		return ss.rpts.CatStat.GetAccountDistribution(ctx, categoryID, p)
	}, "category_statistics")
}

// GetAverageTransactionSize returns average transaction size with Redis caching
func (ss CategoryStatisticsService) GetAverageTransactionSize(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAverageTransactionSizeModel, error) {
	cacheKey := common.BuildStatisticsCacheKey(constants.EntityCategory, categoryID, constants.CategoryStatisticsTransactionSizeSuffix, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLStatistics, func(ctx context.Context) (models.CategoryStatisticAverageTransactionSizeModel, error) {
		return ss.rpts.CatStat.GetAverageTransactionSize(ctx, categoryID, p)
	}, "category_statistics")
}

// GetDayOfWeekPattern returns day of week pattern with Redis caching
func (ss CategoryStatisticsService) GetDayOfWeekPattern(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticDayOfWeekPatternModel, error) {
	cacheKey := common.BuildStatisticsCacheKey(constants.EntityCategory, categoryID, constants.CategoryStatisticsDayOfWeekPatternSuffix, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLStatistics, func(ctx context.Context) (models.CategoryStatisticDayOfWeekPatternModel, error) {
		return ss.rpts.CatStat.GetDayOfWeekPattern(ctx, categoryID, p)
	}, "category_statistics")
}

// GetBudgetUtilization returns budget utilization with Redis caching
func (ss CategoryStatisticsService) GetBudgetUtilization(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticBudgetUtilizationModel, error) {
	cacheKey := common.BuildStatisticsCacheKey(constants.EntityCategory, categoryID, constants.CategoryStatisticsBudgetUtilizationSuffix, p)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, constants.CacheTTLStatistics, func(ctx context.Context) (models.CategoryStatisticBudgetUtilizationModel, error) {
		return ss.rpts.CatStat.GetBudgetUtilization(ctx, categoryID, p)
	}, "category_statistics")
}
