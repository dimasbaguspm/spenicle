package services

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"
)

type TransactionService struct {
	rpts        *repositories.RootRepository
	rdb         *redis.Client
	geoIndexMgr *common.GeoIndexManager
}

func NewTransactionService(rpts *repositories.RootRepository, rdb *redis.Client) TransactionService {
	geoConfig := common.GeoIndexConfig{
		Key:   "transactions:geo",
		TTL:   24 * time.Hour,
		Label: "transaction_geo",
	}
	return TransactionService{
		rpts,
		rdb,
		common.NewGeoIndexManager(rdb, geoConfig),
	}
}

func (ts TransactionService) GetGeoIndexManager() *common.GeoIndexManager {
	return ts.geoIndexMgr
}

func (ts TransactionService) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	if p.Latitude != nil && p.Longitude != nil {
		geoIDs, err := ts.geoIndexMgr.Search(ctx, *p.Longitude, *p.Latitude, p.RadiusMeters)
		if err != nil && err != redis.Nil {
			observability.NewLogger("service", "TransactionService").Warn("geo search failed", "error", err)
		} else if len(geoIDs) > 0 {
			ids := make([]int, len(geoIDs))
			for i, id := range geoIDs {
				ids[i] = int(id)
			}
			p.IDs = ids
		}
	}

	cacheKey := common.BuildPagedCacheKey(constants.EntityTransaction, p)
	result, err := common.FetchWithCache(ctx, ts.rdb, cacheKey, constants.CacheTTLPaged, func(ctx context.Context) (models.TransactionsPagedModel, error) {
		return ts.rpts.Tsct.GetPaged(ctx, p)
	}, "transaction")

	// Spawn a goroutine per transaction for parallel indexing (especially important for Redis I/O)
	for _, txn := range result.Items {
		if txn.Latitude == nil || txn.Longitude == nil {
			continue
		}
		go func(id int64, lat, lng float64) {
			ts.geoIndexMgr.Index(context.Background(), id, lat, lng)
		}(txn.ID, *txn.Latitude, *txn.Longitude)
	}

	return result, err
}

func (ts TransactionService) GetDetail(ctx context.Context, id int64) (models.TransactionModel, error) {
	cacheKey := common.BuildDetailCacheKey(constants.EntityTransaction, id)
	result, err := common.FetchWithCache(ctx, ts.rdb, cacheKey, constants.CacheTTLDetail, func(ctx context.Context) (models.TransactionModel, error) {
		return ts.rpts.Tsct.GetDetail(ctx, id)
	}, "transaction")

	// Async index geolocation if coordinates exist
	if err == nil && result.Latitude != nil && result.Longitude != nil {
		go func() {
			ts.geoIndexMgr.Index(context.Background(), result.ID, *result.Latitude, *result.Longitude)
		}()
	}

	return result, err
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {
	// Validate coordinates: both must be present or both must be nil
	if (p.Latitude != nil && p.Longitude == nil) || (p.Latitude == nil && p.Longitude != nil) {
		return models.TransactionModel{}, huma.Error400BadRequest("Both latitude and longitude must be provided together or neither")
	}

	if err := ts.validateReferences(ctx, p.Type, p.AccountID, p.DestinationAccountID, &p.CategoryID); err != nil {
		return models.TransactionModel{}, err
	}

	tx, err := ts.rpts.Pool.Begin(ctx)

	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("Unable to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	transaction, err := rootTx.Tsct.Create(ctx, p)
	if err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.applyBalanceChanges(ctx, rootTx, p.Type, p.Amount, p.AccountID, p.DestinationAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	// Fire async goroutine to index in Redis Geo if coordinates provided
	if p.Latitude != nil && p.Longitude != nil {
		go func() {
			ts.geoIndexMgr.Index(context.Background(), transaction.ID, *p.Latitude, *p.Longitude)
		}()
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityTransaction, map[string]interface{}{
		"transactionId": transaction.ID,
		"accountId":     p.AccountID,
		"categoryId":    p.CategoryID,
	}); err != nil {
		observability.NewLogger("service", "TransactionService").Warn("cache invalidation failed", "error", err)
	}

	return transaction, nil
}

func (ts TransactionService) Update(ctx context.Context, id int64, p models.UpdateTransactionModel) (models.TransactionModel, error) {
	// Validate coordinates: both must be present or both must be nil
	if (p.Latitude != nil && p.Longitude == nil) || (p.Latitude == nil && p.Longitude != nil) {
		return models.TransactionModel{}, huma.Error400BadRequest("Both latitude and longitude must be provided together or neither")
	}

	tx, err := ts.rpts.Pool.Begin(ctx)
	if err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	existing, err := rootTx.Tsct.GetDetail(ctx, id)
	if err != nil {
		return models.TransactionModel{}, err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, rootTx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	transaction, err := rootTx.Tsct.Update(ctx, id, p)
	if err != nil {
		return models.TransactionModel{}, err
	}

	newType := existing.Type
	if p.Type != nil {
		newType = *p.Type
	}
	newAmount := existing.Amount
	if p.Amount != nil {
		newAmount = *p.Amount
	}
	newAccountID := existing.Account.ID
	if p.AccountID != nil {
		newAccountID = *p.AccountID
	}
	newCategoryID := existing.Category.ID
	if p.CategoryID != nil {
		newCategoryID = *p.CategoryID
	}
	newDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		newDestAccountID = &existing.DestinationAccount.ID
	}
	if p.DestinationAccountID != nil && *p.DestinationAccountID != 0 {
		newDestAccountID = p.DestinationAccountID
	}

	if err := ts.validateReferences(ctx, newType, newAccountID, newDestAccountID, &newCategoryID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := ts.applyBalanceChanges(ctx, rootTx, newType, newAmount, newAccountID, newDestAccountID); err != nil {
		return models.TransactionModel{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return models.TransactionModel{}, huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	// Fire async goroutine to update geo index if coordinates changed
	if p.Latitude != nil && p.Longitude != nil {
		// Update with new coordinates
		go func() {
			ts.geoIndexMgr.Update(context.Background(), transaction.ID, *p.Latitude, *p.Longitude)
		}()
	} else if p.Latitude == nil && p.Longitude == nil && existing.Latitude != nil && existing.Longitude != nil {
		// Remove from geo index if coordinates were cleared
		go func() {
			ts.geoIndexMgr.Remove(context.Background(), transaction.ID)
		}()
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityTransaction, map[string]interface{}{
		"transactionId": transaction.ID,
		"accountId":     existing.Account.ID,
		"categoryId":    existing.Category.ID,
	}); err != nil {
		observability.NewLogger("service", "TransactionService").Warn("cache invalidation failed", "error", err)
	}
	// Also invalidate new account/category if they changed
	if newAccountID != existing.Account.ID {
		if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityAccount, map[string]interface{}{"accountId": newAccountID}); err != nil {
			observability.NewLogger("service", "TransactionService").Warn("cache invalidation failed", "error", err)
		}
	}
	if newCategoryID != existing.Category.ID {
		if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityCategory, map[string]interface{}{"categoryId": newCategoryID}); err != nil {
			observability.NewLogger("service", "TransactionService").Warn("cache invalidation failed", "error", err)
		}
	}
	return transaction, nil
}

func (ts TransactionService) Delete(ctx context.Context, id int64) error {
	tx, err := ts.rpts.Pool.Begin(ctx)
	if err != nil {
		return huma.Error422UnprocessableEntity("failed to start transaction")
	}
	defer tx.Rollback(ctx)

	rootTx := ts.rpts.WithTx(ctx, tx)
	existing, err := rootTx.Tsct.GetDetail(ctx, id)
	if err != nil {
		return err
	}

	oldDestAccountID := (*int64)(nil)
	if existing.DestinationAccount != nil {
		oldDestAccountID = &existing.DestinationAccount.ID
	}
	if err := ts.revertBalanceChanges(ctx, rootTx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
		return err
	}

	if err := rootTx.Tsct.Delete(ctx, id); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return huma.Error422UnprocessableEntity("failed to commit transaction")
	}

	// Fire async goroutine to remove from geo index if coordinates exist
	if existing.Latitude != nil && existing.Longitude != nil {
		go func() {
			ts.geoIndexMgr.Remove(context.Background(), existing.ID)
		}()
	}

	if err := common.InvalidateCacheForEntity(ctx, ts.rdb, constants.EntityTransaction, map[string]interface{}{
		"transactionId": existing.ID,
		"accountId":     existing.Account.ID,
		"categoryId":    existing.Category.ID,
	}); err != nil {
		observability.NewLogger("service", "TransactionService").Warn("cache invalidation failed", "error", err)
	}

	return nil
}

func (ts TransactionService) applyBalanceChanges(ctx context.Context, root repositories.RootRepository, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update source account balance")
			}
			if err := root.Acc.UpdateBalance(ctx, *destAccountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to update destination account balance")
			}
		}
	case "income":
		if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	case "expense":
		if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to update account balance")
		}
	}
	return nil
}

func (ts TransactionService) revertBalanceChanges(ctx context.Context, root repositories.RootRepository, txType string, amount int64, accountID int64, destAccountID *int64) error {
	switch txType {
	case "transfer":
		if destAccountID != nil {
			if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert source account balance")
			}
			if err := root.Acc.UpdateBalance(ctx, *destAccountID, -amount); err != nil {
				return huma.Error422UnprocessableEntity("failed to revert destination account balance")
			}
		}
	case "income":
		if err := root.Acc.UpdateBalance(ctx, accountID, -amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	case "expense":
		if err := root.Acc.UpdateBalance(ctx, accountID, amount); err != nil {
			return huma.Error422UnprocessableEntity("failed to revert account balance")
		}
	}
	return nil
}

func (ts TransactionService) validateReferences(ctx context.Context, txType string, accountID int64, destAccountID *int64, categoryID *int64) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		if _, err := ts.rpts.Acc.GetDetail(ctx, accountID); err != nil {
			return huma.Error400BadRequest("Account not found", err)
		}
		return nil
	})

	g.Go(func() error {
		if txType == "transfer" {
			if destAccountID == nil || *destAccountID == 0 {
				return huma.Error400BadRequest("Destination account is required for transfer")
			}
		}
		if destAccountID != nil && *destAccountID != 0 {
			if _, err := ts.rpts.Acc.GetDetail(ctx, *destAccountID); err != nil {
				return huma.Error400BadRequest("Destination account not found", err)
			}
		}
		return nil
	})

	g.Go(func() error {
		if categoryID != nil && *categoryID != 0 {
			cat, err := ts.rpts.Cat.GetDetail(ctx, *categoryID)
			if err != nil {
				return huma.Error400BadRequest("Category not found", err)
			}
			if txType == "income" || txType == "expense" {
				if cat.Type != txType {
					return huma.Error400BadRequest("Category type does not match transaction type")
				}
			}
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return err
	}
	return nil
}
