package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/redis/go-redis/v9"
)

const (
	maxBulkDraftSize = 500 // Business logic constraint for bulk operations
)

// Internal structs for Redis storage
type bulkTransactionDraftMetadata struct {
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	TransactionCount int       `json:"transactionCount"`
}

type bulkTransactionDraftData struct {
	Updates  []models.BulkTransactionUpdateItemModel `json:"updates"`
	Metadata bulkTransactionDraftMetadata            `json:"metadata"`
}

type TransactionBulkService struct {
	rpts *repositories.RootRepository
	rdb  *redis.Client
	tsvc TransactionService // Reuse existing transaction service for validation/balance logic
}

func NewTransactionBulkService(rpts *repositories.RootRepository, rdb *redis.Client, tsvc TransactionService) TransactionBulkService {
	return TransactionBulkService{
		rpts: rpts,
		rdb:  rdb,
		tsvc: tsvc,
	}
}

// SaveDraft saves pending transaction updates to Redis (single global draft)
func (tbs TransactionBulkService) SaveDraft(ctx context.Context, draft models.BulkTransactionDraftModel) (models.BulkTransactionDraftResponseModel, error) {
	if len(draft.Updates) > maxBulkDraftSize {
		return models.BulkTransactionDraftResponseModel{}, huma.Error400BadRequest(
			fmt.Sprintf("Draft size exceeds maximum of %d transactions", maxBulkDraftSize),
		)
	}

	now := time.Now()
	draftData := bulkTransactionDraftData{
		Updates: draft.Updates,
		Metadata: bulkTransactionDraftMetadata{
			CreatedAt:        now,
			UpdatedAt:        now,
			TransactionCount: len(draft.Updates),
		},
	}

	// Check if draft exists to preserve createdAt
	if existing, err := tbs.rdb.Get(ctx, constants.BulkDraftKey).Result(); err == nil {
		var existingData bulkTransactionDraftData
		if json.Unmarshal([]byte(existing), &existingData) == nil {
			draftData.Metadata.CreatedAt = existingData.Metadata.CreatedAt
		}
	}

	jsonData, err := json.Marshal(draftData)
	if err != nil {
		return models.BulkTransactionDraftResponseModel{}, huma.Error500InternalServerError("Failed to serialize draft", err)
	}

	if err := tbs.rdb.Set(ctx, constants.BulkDraftKey, jsonData, constants.CacheTTLBulkDraft).Err(); err != nil {
		observability.RecordError("redis")
		return models.BulkTransactionDraftResponseModel{}, huma.Error500InternalServerError("Failed to save draft", err)
	}

	return models.BulkTransactionDraftResponseModel{
		TransactionCount: len(draft.Updates),
		CreatedAt:        draftData.Metadata.CreatedAt,
		UpdatedAt:        now,
		ExpiresAt:        now.Add(constants.CacheTTLBulkDraft),
	}, nil
}

// GetDraft retrieves saved draft from Redis
func (tbs TransactionBulkService) GetDraft(ctx context.Context) (models.BulkTransactionDraftModel, models.BulkTransactionDraftResponseModel, error) {
	jsonData, err := tbs.rdb.Get(ctx, constants.BulkDraftKey).Result()
	if err == redis.Nil {
		return models.BulkTransactionDraftModel{}, models.BulkTransactionDraftResponseModel{}, huma.Error404NotFound("Draft not found or expired")
	}
	if err != nil {
		observability.RecordError("redis")
		return models.BulkTransactionDraftModel{}, models.BulkTransactionDraftResponseModel{}, huma.Error500InternalServerError("Failed to retrieve draft", err)
	}

	var draftData bulkTransactionDraftData
	if err := json.Unmarshal([]byte(jsonData), &draftData); err != nil {
		return models.BulkTransactionDraftModel{}, models.BulkTransactionDraftResponseModel{}, huma.Error500InternalServerError("Failed to parse draft", err)
	}

	ttl, _ := tbs.rdb.TTL(ctx, constants.BulkDraftKey).Result()

	return models.BulkTransactionDraftModel{
			Updates: draftData.Updates,
		}, models.BulkTransactionDraftResponseModel{
			TransactionCount: len(draftData.Updates),
			CreatedAt:        draftData.Metadata.CreatedAt,
			UpdatedAt:        draftData.Metadata.UpdatedAt,
			ExpiresAt:        time.Now().Add(ttl),
		}, nil
}

// CommitDraft applies all draft changes atomically to database
func (tbs TransactionBulkService) CommitDraft(ctx context.Context) (models.BulkTransactionCommitResponseModel, error) {
	startTime := time.Now()

	// 1. Retrieve draft from Redis
	draft, _, err := tbs.GetDraft(ctx)
	if err != nil {
		return models.BulkTransactionCommitResponseModel{}, err
	}

	// 2. Start database transaction
	tx, err := tbs.rpts.Pool.Begin(ctx)
	if err != nil {
		return models.BulkTransactionCommitResponseModel{}, huma.Error500InternalServerError("Failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	rootTx := tbs.rpts.WithTx(ctx, tx)

	// 3. Process each transaction update
	updatedIDs := make([]int64, 0, len(draft.Updates))
	affectedAccounts := make(map[int64]bool)
	affectedCategories := make(map[int64]bool)

	for _, update := range draft.Updates {
		// Fetch existing transaction
		existing, err := rootTx.Tsct.GetDetail(ctx, update.ID)
		if err != nil {
			return models.BulkTransactionCommitResponseModel{}, huma.Error404NotFound(
				fmt.Sprintf("Transaction %d not found", update.ID),
			)
		}

		// Track affected accounts/categories for cache invalidation
		affectedAccounts[existing.Account.ID] = true
		if existing.Category.ID != 0 {
			affectedCategories[existing.Category.ID] = true
		}

		// Validate coordinates (both or none)
		latPresent := update.Latitude != nil && *update.Latitude != 0
		lngPresent := update.Longitude != nil && *update.Longitude != 0
		if (latPresent && !lngPresent) || (!latPresent && lngPresent) {
			return models.BulkTransactionCommitResponseModel{}, huma.Error400BadRequest(
				fmt.Sprintf("Transaction %d: Both latitude and longitude must be provided together", update.ID),
			)
		}

		// Determine new values (use existing if not provided)
		newType := existing.Type
		if update.Type != nil {
			newType = *update.Type
		}

		newAmount := existing.Amount
		if update.Amount != nil {
			newAmount = *update.Amount
		}

		newAccountID := existing.Account.ID
		if update.AccountID != nil {
			newAccountID = *update.AccountID
			affectedAccounts[newAccountID] = true
		}

		newCategoryID := existing.Category.ID
		if update.CategoryID != nil {
			newCategoryID = *update.CategoryID
			affectedCategories[newCategoryID] = true
		}

		var newDestAccountID *int64
		if existing.DestinationAccount != nil {
			destID := existing.DestinationAccount.ID
			newDestAccountID = &destID
		}
		if update.DestinationAccountID != nil {
			newDestAccountID = update.DestinationAccountID
			if newDestAccountID != nil {
				affectedAccounts[*newDestAccountID] = true
			}
		}

		// Get old destination account ID
		var oldDestAccountID *int64
		if existing.DestinationAccount != nil {
			oldDestID := existing.DestinationAccount.ID
			oldDestAccountID = &oldDestID
		}

		// Revert old balance changes
		if err := tbs.tsvc.RevertBalanceChanges(ctx, rootTx, existing.Type, existing.Amount, existing.Account.ID, oldDestAccountID); err != nil {
			return models.BulkTransactionCommitResponseModel{}, err
		}

		// Validate references
		if err := tbs.tsvc.ValidateReferences(ctx, newType, newAccountID, newDestAccountID, &newCategoryID); err != nil {
			return models.BulkTransactionCommitResponseModel{}, huma.Error400BadRequest(
				fmt.Sprintf("Transaction %d: %s", update.ID, err.Error()),
			)
		}

		// Apply new balance changes
		if err := tbs.tsvc.ApplyBalanceChanges(ctx, rootTx, newType, newAmount, newAccountID, newDestAccountID); err != nil {
			return models.BulkTransactionCommitResponseModel{}, err
		}

		// Update transaction fields
		updateModel := models.UpdateTransactionModel{
			Type:                 update.Type,
			Date:                 update.Date,
			Amount:               update.Amount,
			AccountID:            update.AccountID,
			CategoryID:           update.CategoryID,
			DestinationAccountID: update.DestinationAccountID,
			Note:                 update.Note,
			Latitude:             update.Latitude,
			Longitude:            update.Longitude,
		}

		_, err = rootTx.Tsct.Update(ctx, update.ID, updateModel)
		if err != nil {
			return models.BulkTransactionCommitResponseModel{}, err
		}

		updatedIDs = append(updatedIDs, update.ID)
	}

	// 4. Commit database transaction
	if err := tx.Commit(ctx); err != nil {
		return models.BulkTransactionCommitResponseModel{}, huma.Error500InternalServerError("Failed to commit transaction", err)
	}

	// 5. Invalidate caches for all affected entities
	go func() {
		bgCtx := context.Background()

		// Invalidate transaction caches
		common.InvalidateCacheForEntity(bgCtx, tbs.rdb, constants.EntityTransaction, map[string]interface{}{})

		// Invalidate account caches
		for accountID := range affectedAccounts {
			common.InvalidateCacheForEntity(bgCtx, tbs.rdb, constants.EntityAccount, map[string]interface{}{
				"accountId": accountID,
			})
		}

		// Invalidate category caches
		for categoryID := range affectedCategories {
			common.InvalidateCacheForEntity(bgCtx, tbs.rdb, constants.EntityCategory, map[string]interface{}{
				"categoryId": categoryID,
			})
		}
	}()

	tbs.rdb.Del(ctx, constants.BulkDraftKey)

	return models.BulkTransactionCommitResponseModel{
		SuccessCount: len(updatedIDs),
		UpdatedIDs:   updatedIDs,
		DurationMs:   time.Since(startTime).Milliseconds(),
	}, nil
}

// DeleteDraft removes draft from Redis without committing
func (tbs TransactionBulkService) DeleteDraft(ctx context.Context) error {
	result, err := tbs.rdb.Del(ctx, constants.BulkDraftKey).Result()
	if err != nil {
		observability.RecordError("redis")
		return huma.Error500InternalServerError("Failed to delete draft", err)
	}

	if result == 0 {
		return huma.Error404NotFound("Draft not found or already deleted")
	}

	return nil
}
