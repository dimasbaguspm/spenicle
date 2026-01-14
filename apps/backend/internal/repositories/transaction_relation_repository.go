package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionRelationRepository struct {
	pgx *pgxpool.Pool
}

func NewTransactionRelationRepository(pgx *pgxpool.Pool) TransactionRelationRepository {
	return TransactionRelationRepository{pgx}
}

// List retrieves paginated transaction relations for a specific transaction
func (trr TransactionRelationRepository) List(ctx context.Context, transactionID int64, pageNumber, pageSize int) (models.ListTransactionRelationsResponseModel, error) {
	// Enforce page size limits
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	if pageNumber <= 0 {
		pageNumber = 1
	}

	offset := (pageNumber - 1) * pageSize

	// Count total matching relations
	countSQL := `SELECT COUNT(*) FROM transaction_relations WHERE transaction_id = $1`
	var totalCount int
	if err := trr.pgx.QueryRow(ctx, countSQL, transactionID).Scan(&totalCount); err != nil {
		return models.ListTransactionRelationsResponseModel{}, huma.Error400BadRequest("Unable to count transaction relations", err)
	}

	// Fetch paginated relations
	sql := `
		SELECT id, transaction_id, related_transaction_id, created_at
		FROM transaction_relations
		WHERE transaction_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := trr.pgx.Query(ctx, sql, transactionID, pageSize, offset)
	if err != nil {
		return models.ListTransactionRelationsResponseModel{}, huma.Error400BadRequest("Unable to query transaction relations", err)
	}
	defer rows.Close()

	var items []models.TransactionRelationModel
	for rows.Next() {
		var item models.TransactionRelationModel
		if err := rows.Scan(
			&item.ID, &item.TransactionID, &item.RelatedTransactionID, &item.CreatedAt,
		); err != nil {
			return models.ListTransactionRelationsResponseModel{}, huma.Error400BadRequest("Unable to scan transaction relation data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListTransactionRelationsResponseModel{}, huma.Error400BadRequest("Error reading transaction relation rows", err)
	}

	if items == nil {
		items = []models.TransactionRelationModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + pageSize - 1) / pageSize
	}

	return models.ListTransactionRelationsResponseModel{
		Data:       items,
		PageNumber: pageNumber,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get retrieves a single transaction relation by ID
func (trr TransactionRelationRepository) Get(ctx context.Context, id int64) (models.TransactionRelationModel, error) {
	query := `
		SELECT id, transaction_id, related_transaction_id, created_at
		FROM transaction_relations
		WHERE id = $1`

	var item models.TransactionRelationModel
	err := trr.pgx.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.TransactionID, &item.RelatedTransactionID, &item.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.TransactionRelationModel{}, huma.Error404NotFound("Transaction relation not found")
	}
	if err != nil {
		return models.TransactionRelationModel{}, huma.Error400BadRequest("Unable to query transaction relation", err)
	}

	return item, nil
}

// Create creates a new transaction relation
func (trr TransactionRelationRepository) Create(ctx context.Context, p models.CreateTransactionRelationRequestModel) (models.CreateTransactionRelationResponseModel, error) {
	// Validate that we're not relating a transaction to itself
	if p.TransactionID == p.RelatedTransactionID {
		return models.CreateTransactionRelationResponseModel{}, huma.Error400BadRequest("Cannot relate a transaction to itself", nil)
	}

	// Verify both transactions exist
	existsSQL := `SELECT 1 FROM transactions WHERE id = $1 AND deleted_at IS NULL`

	var exists int
	if err := trr.pgx.QueryRow(ctx, existsSQL, p.TransactionID).Scan(&exists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.CreateTransactionRelationResponseModel{}, huma.Error404NotFound("Source transaction not found")
		}
		return models.CreateTransactionRelationResponseModel{}, huma.Error400BadRequest("Unable to verify source transaction", err)
	}

	if err := trr.pgx.QueryRow(ctx, existsSQL, p.RelatedTransactionID).Scan(&exists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.CreateTransactionRelationResponseModel{}, huma.Error404NotFound("Related transaction not found")
		}
		return models.CreateTransactionRelationResponseModel{}, huma.Error400BadRequest("Unable to verify related transaction", err)
	}

	// Check if relation already exists
	duplicateSQL := `
		SELECT 1 FROM transaction_relations
		WHERE transaction_id = $1 AND related_transaction_id = $2`

	if err := trr.pgx.QueryRow(ctx, duplicateSQL, p.TransactionID, p.RelatedTransactionID).Scan(&exists); err == nil {
		return models.CreateTransactionRelationResponseModel{}, huma.Error400BadRequest("Transaction relation already exists", nil)
	}

	query := `
		INSERT INTO transaction_relations (transaction_id, related_transaction_id)
		VALUES ($1, $2)
		RETURNING id, transaction_id, related_transaction_id, created_at`

	var item models.TransactionRelationModel
	err := trr.pgx.QueryRow(
		ctx,
		query,
		p.TransactionID,
		p.RelatedTransactionID,
	).Scan(
		&item.ID, &item.TransactionID, &item.RelatedTransactionID, &item.CreatedAt,
	)

	if err != nil {
		return models.CreateTransactionRelationResponseModel{}, huma.Error400BadRequest("Unable to create transaction relation", err)
	}

	return models.CreateTransactionRelationResponseModel{TransactionRelationModel: item}, nil
}

// Delete deletes a transaction relation
func (trr TransactionRelationRepository) Delete(ctx context.Context, id int64) error {
	sql := `DELETE FROM transaction_relations WHERE id = $1`

	cmdTag, err := trr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction relation", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction relation not found")
	}

	return nil
}

// DeleteByTransactionIDs deletes a relation between two transactions
func (trr TransactionRelationRepository) DeleteByTransactionIDs(ctx context.Context, transactionID, relatedTransactionID int64) error {
	sql := `DELETE FROM transaction_relations WHERE transaction_id = $1 AND related_transaction_id = $2`

	cmdTag, err := trr.pgx.Exec(ctx, sql, transactionID, relatedTransactionID)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction relation", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction relation not found")
	}

	return nil
}
