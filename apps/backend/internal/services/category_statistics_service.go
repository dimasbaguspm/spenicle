package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	CategoryStatisticsCacheTTL = 5 * time.Minute
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
	// Fetch all statistics in parallel
	velocityChan := make(chan models.CategoryStatisticSpendingVelocityModel)
	distributionChan := make(chan models.CategoryStatisticAccountDistributionModel)
	avgSizeChan := make(chan models.CategoryStatisticAverageTransactionSizeModel)
	dayPatternChan := make(chan models.CategoryStatisticDayOfWeekPatternModel)
	budgetChan := make(chan models.CategoryStatisticBudgetUtilizationModel)
	errChan := make(chan error, 5)

	// Fetch spending velocity
	go func() {
		data, err := ss.GetSpendingVelocity(ctx, categoryID, p)
		if err != nil {
			errChan <- err
		} else {
			velocityChan <- data
		}
	}()

	// Fetch account distribution
	go func() {
		data, err := ss.GetAccountDistribution(ctx, categoryID, p)
		if err != nil {
			errChan <- err
		} else {
			distributionChan <- data
		}
	}()

	// Fetch average transaction size
	go func() {
		data, err := ss.GetAverageTransactionSize(ctx, categoryID, p)
		if err != nil {
			errChan <- err
		} else {
			avgSizeChan <- data
		}
	}()

	// Fetch day of week pattern
	go func() {
		data, err := ss.GetDayOfWeekPattern(ctx, categoryID, p)
		if err != nil {
			errChan <- err
		} else {
			dayPatternChan <- data
		}
	}()

	// Fetch budget utilization
	go func() {
		data, err := ss.GetBudgetUtilization(ctx, categoryID, p)
		if err != nil {
			errChan <- err
		} else {
			budgetChan <- data
		}
	}()

	var velocity models.CategoryStatisticSpendingVelocityModel
	var distribution models.CategoryStatisticAccountDistributionModel
	var avgSize models.CategoryStatisticAverageTransactionSizeModel
	var dayPattern models.CategoryStatisticDayOfWeekPatternModel
	var budget models.CategoryStatisticBudgetUtilizationModel

	// Collect results
	for i := 0; i < 5; i++ {
		select {
		case err := <-errChan:
			return models.CategoryStatisticsResponse{}, err
		case velocity = <-velocityChan:
		case distribution = <-distributionChan:
		case avgSize = <-avgSizeChan:
		case dayPattern = <-dayPatternChan:
		case budget = <-budgetChan:
		}
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
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.CategoryStatisticsCacheKeyPrefix, constants.CategoryStatisticsSpendingVelocitySuffix, categoryID, string(data))

	cached, err := common.GetCache[models.CategoryStatisticSpendingVelocityModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.CatStat.GetSpendingVelocity(ctx, categoryID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, CategoryStatisticsCacheTTL)
	return result, nil
}

// GetAccountDistribution returns account distribution with Redis caching
func (ss CategoryStatisticsService) GetAccountDistribution(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAccountDistributionModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.CategoryStatisticsCacheKeyPrefix, constants.CategoryStatisticsAccountDistributionSuffix, categoryID, string(data))

	cached, err := common.GetCache[models.CategoryStatisticAccountDistributionModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.CatStat.GetAccountDistribution(ctx, categoryID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, CategoryStatisticsCacheTTL)
	return result, nil
}

// GetAverageTransactionSize returns average transaction size with Redis caching
func (ss CategoryStatisticsService) GetAverageTransactionSize(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticAverageTransactionSizeModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.CategoryStatisticsCacheKeyPrefix, constants.CategoryStatisticsTransactionSizeSuffix, categoryID, string(data))

	cached, err := common.GetCache[models.CategoryStatisticAverageTransactionSizeModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.CatStat.GetAverageTransactionSize(ctx, categoryID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, CategoryStatisticsCacheTTL)
	return result, nil
}

// GetDayOfWeekPattern returns day of week pattern with Redis caching
func (ss CategoryStatisticsService) GetDayOfWeekPattern(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticDayOfWeekPatternModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.CategoryStatisticsCacheKeyPrefix, constants.CategoryStatisticsDayOfWeekPatternSuffix, categoryID, string(data))

	cached, err := common.GetCache[models.CategoryStatisticDayOfWeekPatternModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.CatStat.GetDayOfWeekPattern(ctx, categoryID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, CategoryStatisticsCacheTTL)
	return result, nil
}

// GetBudgetUtilization returns budget utilization with Redis caching
func (ss CategoryStatisticsService) GetBudgetUtilization(ctx context.Context, categoryID int64, p models.CategoryStatisticsSearchModel) (models.CategoryStatisticBudgetUtilizationModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.CategoryStatisticsCacheKeyPrefix, constants.CategoryStatisticsBudgetUtilizationSuffix, categoryID, string(data))

	cached, err := common.GetCache[models.CategoryStatisticBudgetUtilizationModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.CatStat.GetBudgetUtilization(ctx, categoryID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, CategoryStatisticsCacheTTL)
	return result, nil
}
