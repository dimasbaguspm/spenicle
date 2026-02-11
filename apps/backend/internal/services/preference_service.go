package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type PreferenceService struct {
	rpts        *repositories.RootRepository
	geoIndexMgr *common.GeoIndexManager
}

func NewPreferenceService(rpts *repositories.RootRepository, geoIndexMgr *common.GeoIndexManager) PreferenceService {
	return PreferenceService{
		rpts,
		geoIndexMgr,
	}
}

// RefreshGeoCache triggers background geo index refresh from database
// Returns immediately while indexing happens asynchronously in background
// If latitude/longitude provided, transactions are fetched ordered by distance
func (ps PreferenceService) RefreshGeoCache(ctx context.Context, latitude *float64, longitude *float64) {
	runID := observability.GenerateID()
	logger := observability.NewLogger("service", "PreferenceService", "run_id", runID, "task", "RefreshGeoCache")
	logger.Info("background job started")

	go func() {
		bgCtx := context.Background()
		transactions, err := ps.rpts.Tsct.GetGeotaggedTransactions(bgCtx, latitude, longitude, 100)
		if err != nil {
			logger.Error("failed to fetch geotagged transactions", "error", err)
			return
		}

		if len(transactions) == 0 {
			logger.Info("no geotagged transactions found")
			return
		}

		logger.Info("indexing geotagged transactions", "count", len(transactions))

		// Index each transaction into Redis geo index
		indexedCount := 0
		for _, txn := range transactions {
			if txn.Latitude == nil || txn.Longitude == nil {
				continue
			}

			if err := ps.geoIndexMgr.Index(bgCtx, txn.ID, *txn.Latitude, *txn.Longitude); err != nil {
				logger.Warn("failed to index transaction", "transaction_id", txn.ID, "error", err)
				continue
			}
			indexedCount++
		}

		logger.Info("geo cache refresh completed", "indexed_count", indexedCount)
	}()
}
