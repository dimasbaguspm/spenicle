package workers

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	geoWorkerPoolSize = 5
	geoIndexBatchSize = 500
	geoIndexSchedule  = 12 * time.Hour
)

type GeoIndexTransactionsWorker struct {
	cronWorker *common.CronWorker
	repo       repositories.TransactionRepository
	geoMgr     *common.GeoIndexManager
	rdb        *redis.Client
}

func NewGeoIndexTransactionsWorker(
	ctx context.Context,
	repo repositories.TransactionRepository,
	geoMgr *common.GeoIndexManager,
	rdb *redis.Client,
) *GeoIndexTransactionsWorker {
	return &GeoIndexTransactionsWorker{
		cronWorker: common.NewCronWorker(ctx),
		repo:       repo,
		geoMgr:     geoMgr,
		rdb:        rdb,
	}
}

func (gitw *GeoIndexTransactionsWorker) Start() error {
	logger := observability.NewLogger("worker", "GeoIndexTransactionsWorker")
	logger.Info("starting")

	// Run every 12 hours to repopulate before TTL expires (TTL is 24h)
	err := gitw.cronWorker.Register(common.CronTask{
		ID:             "repopulate-geo-index",
		Name:           "Repopulate Geo Index",
		Schedule:       geoIndexSchedule,
		Handler:        gitw.repopulateGeoIndex,
		RunImmediately: true, // Run on startup to warm the cache
	})

	if err != nil {
		logger.Error("failed to start", "error", err)
	}
	return nil
}

func (gitw *GeoIndexTransactionsWorker) repopulateGeoIndex(ctx context.Context) error {
	runID := observability.GenerateID()
	logger := observability.NewLogger("worker", "GeoIndexTransactionsWorker", "run_id", runID, "task", "repopulateGeoIndex")
	logger.Info("start")

	// Fetch first 500 transactions in a single call
	searchParams := models.TransactionsSearchModel{
		PageNumber: 1,
		PageSize:   geoIndexBatchSize,
	}

	result, err := gitw.repo.GetPaged(ctx, searchParams)
	if err != nil {
		logger.Error("failed to fetch transactions", "error", err)
		return err
	}

	if len(result.Items) == 0 {
		logger.Info("no transactions to index")
		return nil
	}

	// Filter transactions with coordinates
	var txnsWithGeo []models.TransactionModel
	for _, txn := range result.Items {
		if txn.Latitude != nil && txn.Longitude != nil {
			txnsWithGeo = append(txnsWithGeo, txn)
		}
	}

	if len(txnsWithGeo) == 0 {
		logger.Info("no transactions with coordinates found")
		return nil
	}

	logger.Info("starting geo index repopulation", "count", len(txnsWithGeo), "workers", geoWorkerPoolSize)

	// Process transactions with worker pool pattern
	successCount, failureCount := gitw.processWithWorkerPool(ctx, txnsWithGeo, logger)

	logger.Info("completed", "success_count", successCount, "failure_count", failureCount, "total", len(txnsWithGeo))
	observability.GeoIndexRepopulated.Add(float64(successCount))
	observability.GeoIndexWorkerRuns.Inc()

	return nil
}

func (gitw *GeoIndexTransactionsWorker) processWithWorkerPool(
	ctx context.Context,
	transactions []models.TransactionModel,
	logger *slog.Logger,
) (int, int) {
	// Create channel for work distribution
	workChan := make(chan models.TransactionModel, len(transactions))
	defer close(workChan)

	// Track success and failure counts per worker
	var successCount, failureCount int
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Spawn worker pool
	for workerID := 0; workerID < geoWorkerPoolSize; workerID++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			gitw.indexWorker(ctx, id, workChan, logger, &successCount, &failureCount, &mu)
		}(workerID)
	}

	// Feed work to channel
	go func() {
		for _, txn := range transactions {
			workChan <- txn
		}
	}()

	// Wait for all workers to finish
	wg.Wait()

	return successCount, failureCount
}

func (gitw *GeoIndexTransactionsWorker) indexWorker(
	ctx context.Context,
	workerID int,
	workChan <-chan models.TransactionModel,
	logger *slog.Logger,
	successCount, failureCount *int,
	mu *sync.Mutex,
) {
	workerLogger := logger.With("worker_id", workerID)

	for txn := range workChan {
		if txn.Latitude == nil || txn.Longitude == nil {
			continue
		}

		err := gitw.geoMgr.Index(ctx, txn.ID, *txn.Latitude, *txn.Longitude)

		mu.Lock()
		if err != nil {
			*failureCount++
			mu.Unlock()
			workerLogger.Warn("failed to index transaction", "transaction_id", txn.ID, "error", err)
		} else {
			*successCount++
			mu.Unlock()
		}
	}
}

func (gitw *GeoIndexTransactionsWorker) Stop() {
	logger := observability.NewLogger("worker", "GeoIndexTransactionsWorker")
	logger.Info("stopping")
	gitw.cronWorker.Stop()
}
