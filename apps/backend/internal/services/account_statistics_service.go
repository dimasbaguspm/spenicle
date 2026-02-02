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
	AccountStatisticsCacheTTL = 5 * time.Minute
)

type AccountStatisticsService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
}

// AccStatService is a shorter alias for AccountStatisticsService
type AccStatService = AccountStatisticsService

func NewAccountStatisticsService(rpts *repositories.RootRepository, rdb *redis.Client) AccountStatisticsService {
	return AccountStatisticsService{rpts, rdb}
}

// GetAccountStatistics returns comprehensive statistics for an account within a time period
func (ss AccountStatisticsService) GetAccountStatistics(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsResponse, error) {
	// Fetch all statistics in parallel
	categoryHeatmapChan := make(chan models.AccountStatisticsCategoryHeatmapModel)
	monthlyVelocityChan := make(chan models.AccountStatisticsMonthlyVelocityModel)
	timeFrequencyChan := make(chan models.AccountStatisticsTimeFrequencyHeatmapModel)
	cashFlowPulseChan := make(chan models.AccountStatisticsCashFlowPulseModel)
	burnRateChan := make(chan models.AccountStatisticsBurnRateModel)
	budgetHealthChan := make(chan models.AccountStatisticsBudgetHealthModel)
	errChan := make(chan error, 6)

	// Fetch category heatmap
	go func() {
		data, err := ss.rpts.AccStat.GetCategoryHeatmap(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			categoryHeatmapChan <- data
		}
	}()

	// Fetch monthly velocity
	go func() {
		data, err := ss.rpts.AccStat.GetMonthlyVelocity(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			monthlyVelocityChan <- data
		}
	}()

	// Fetch time frequency
	go func() {
		data, err := ss.rpts.AccStat.GetTimeFrequencyHeatmap(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			timeFrequencyChan <- data
		}
	}()

	// Fetch cash flow pulse
	go func() {
		data, err := ss.rpts.AccStat.GetCashFlowPulse(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			cashFlowPulseChan <- data
		}
	}()

	// Fetch burn rate
	go func() {
		data, err := ss.rpts.AccStat.GetBurnRate(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			burnRateChan <- data
		}
	}()

	// Fetch budget health
	go func() {
		data, err := ss.rpts.AccStat.GetBudgetHealth(ctx, accountID, p)
		if err != nil {
			errChan <- err
		} else {
			budgetHealthChan <- data
		}
	}()

	// Collect results
	var categoryHeatmap models.AccountStatisticsCategoryHeatmapModel
	var monthlyVelocity models.AccountStatisticsMonthlyVelocityModel
	var timeFrequency models.AccountStatisticsTimeFrequencyHeatmapModel
	var cashFlowPulse models.AccountStatisticsCashFlowPulseModel
	var burnRate models.AccountStatisticsBurnRateModel
	var budgetHealth models.AccountStatisticsBudgetHealthModel

	for i := 0; i < 6; i++ {
		select {
		case err := <-errChan:
			return models.AccountStatisticsResponse{}, err
		case ch := <-categoryHeatmapChan:
			categoryHeatmap = ch
		case mv := <-monthlyVelocityChan:
			monthlyVelocity = mv
		case tf := <-timeFrequencyChan:
			timeFrequency = tf
		case cfp := <-cashFlowPulseChan:
			cashFlowPulse = cfp
		case br := <-burnRateChan:
			burnRate = br
		case bh := <-budgetHealthChan:
			budgetHealth = bh
		}
	}

	return models.AccountStatisticsResponse{
		AccountID:            accountID,
		Period:               p.StartDate.String() + " to " + p.EndDate.String(),
		CategoryHeatmap:      categoryHeatmap,
		MonthlyVelocity:      monthlyVelocity,
		TimeFrequencyHeatmap: timeFrequency,
		CashFlowPulse:        cashFlowPulse,
		BurnRate:             burnRate,
		BudgetHealth:         budgetHealth,
	}, nil
}

// GetCategoryHeatmap returns category spending distribution
func (ss AccountStatisticsService) GetCategoryHeatmap(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsCategoryHeatmapModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsCategoryHeatmapSuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsCategoryHeatmapModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetCategoryHeatmap(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}

// GetMonthlyVelocity returns monthly spending trends
func (ss AccountStatisticsService) GetMonthlyVelocity(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsMonthlyVelocityModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsMonthlyVelocitySuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsMonthlyVelocityModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetMonthlyVelocity(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}

// GetTimeFrequencyHeatmap returns transaction frequency distribution
func (ss AccountStatisticsService) GetTimeFrequencyHeatmap(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsTimeFrequencyHeatmapModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsTimeFrequencySuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsTimeFrequencyHeatmapModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetTimeFrequencyHeatmap(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}

// GetCashFlowPulse returns daily balance trend
func (ss AccountStatisticsService) GetCashFlowPulse(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsCashFlowPulseModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsCashFlowPulseSuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsCashFlowPulseModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetCashFlowPulse(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}

// GetBurnRate returns spending rate analysis
func (ss AccountStatisticsService) GetBurnRate(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBurnRateModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsBurnRateSuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsBurnRateModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetBurnRate(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}

// GetBudgetHealth returns budget health metrics
func (ss AccountStatisticsService) GetBudgetHealth(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBudgetHealthModel, error) {
	data, _ := json.Marshal(p)
	cacheKey := fmt.Sprintf("%s%s:%d:%s", constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsBudgetHealthSuffix, accountID, string(data))

	cached, err := common.GetCache[models.AccountStatisticsBudgetHealthModel](ctx, ss.rdb, cacheKey)
	if err == nil {
		return cached, nil
	}

	result, err := ss.rpts.AccStat.GetBudgetHealth(ctx, accountID, p)
	if err != nil {
		return result, err
	}

	common.SetCache(ctx, ss.rdb, cacheKey, result, AccountStatisticsCacheTTL)
	return result, nil
}
