package services

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
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
	// Use errgroup for cleaner goroutine coordination
	eg, egCtx := errgroup.WithContext(ctx)

	// Allocate variables for results
	var categoryHeatmap models.AccountStatisticsCategoryHeatmapModel
	var monthlyVelocity models.AccountStatisticsMonthlyVelocityModel
	var timeFrequency models.AccountStatisticsTimeFrequencyHeatmapModel
	var cashFlowPulse models.AccountStatisticsCashFlowPulseModel
	var burnRate models.AccountStatisticsBurnRateModel
	var budgetHealth models.AccountStatisticsBudgetHealthModel

	// Launch all statistics fetches in parallel
	eg.Go(func() error {
		data, err := ss.GetCategoryHeatmap(egCtx, accountID, p)
		categoryHeatmap = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetMonthlyVelocity(egCtx, accountID, p)
		monthlyVelocity = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetTimeFrequencyHeatmap(egCtx, accountID, p)
		timeFrequency = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetCashFlowPulse(egCtx, accountID, p)
		cashFlowPulse = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetBurnRate(egCtx, accountID, p)
		burnRate = data
		return err
	})

	eg.Go(func() error {
		data, err := ss.GetBudgetHealth(egCtx, accountID, p)
		budgetHealth = data
		return err
	})

	// Wait for all goroutines to complete
	if err := eg.Wait(); err != nil {
		return models.AccountStatisticsResponse{}, err
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
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsCategoryHeatmapSuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsCategoryHeatmapModel, error) {
		return ss.rpts.AccStat.GetCategoryHeatmap(ctx, accountID, p)
	}, "account_statistics")
}

// GetMonthlyVelocity returns monthly spending trends
func (ss AccountStatisticsService) GetMonthlyVelocity(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsMonthlyVelocityModel, error) {
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsMonthlyVelocitySuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsMonthlyVelocityModel, error) {
		return ss.rpts.AccStat.GetMonthlyVelocity(ctx, accountID, p)
	}, "account_statistics")
}

// GetTimeFrequencyHeatmap returns transaction frequency distribution
func (ss AccountStatisticsService) GetTimeFrequencyHeatmap(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsTimeFrequencyHeatmapModel, error) {
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsTimeFrequencySuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsTimeFrequencyHeatmapModel, error) {
		return ss.rpts.AccStat.GetTimeFrequencyHeatmap(ctx, accountID, p)
	}, "account_statistics")
}

// GetCashFlowPulse returns daily balance trend
func (ss AccountStatisticsService) GetCashFlowPulse(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsCashFlowPulseModel, error) {
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsCashFlowPulseSuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsCashFlowPulseModel, error) {
		return ss.rpts.AccStat.GetCashFlowPulse(ctx, accountID, p)
	}, "account_statistics")
}

// GetBurnRate returns spending rate analysis
func (ss AccountStatisticsService) GetBurnRate(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBurnRateModel, error) {
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsBurnRateSuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsBurnRateModel, error) {
		return ss.rpts.AccStat.GetBurnRate(ctx, accountID, p)
	}, "account_statistics")
}

// GetBudgetHealth returns budget health metrics
func (ss AccountStatisticsService) GetBudgetHealth(ctx context.Context, accountID int64, p models.AccountStatisticsSearchModel) (models.AccountStatisticsBudgetHealthModel, error) {
	cacheKey := common.BuildCacheKey(accountID, p, constants.AccountStatisticsCacheKeyPrefix, constants.AccountStatisticsBudgetHealthSuffix)
	return common.FetchWithCache(ctx, ss.rdb, cacheKey, AccountStatisticsCacheTTL, func(ctx context.Context) (models.AccountStatisticsBudgetHealthModel, error) {
		return ss.rpts.AccStat.GetBudgetHealth(ctx, accountID, p)
	}, "account_statistics")
}
