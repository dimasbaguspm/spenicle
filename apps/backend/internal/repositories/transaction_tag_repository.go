package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionTagRepository struct {
	pgx *pgxpool.Pool
}

func NewTransactionTagRepository(pgx *pgxpool.Pool) TransactionTagRepository {
	return TransactionTagRepository{pgx}
}

// List returns a paginated list of tags for a transaction
func (ttr TransactionTagRepository) List(ctx context.Context, transactionID int64, pageNumber int, pageSize int) (models.ListTransactionTagsResponseModel, error) {
	// Enforce page size limits
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	if pageNumber <= 0 {
		pageNumber = 1
	}

	offset := (pageNumber - 1) * pageSize

	countSQL := `SELECT COUNT(*) FROM transaction_tags WHERE transaction_id = $1`
	var totalCount int
	if err := ttr.pgx.QueryRow(ctx, countSQL, transactionID).Scan(&totalCount); err != nil {
		return models.ListTransactionTagsResponseModel{}, huma.Error400BadRequest("Unable to count transaction tags", err)
	}

	sql := `SELECT tt.transaction_id, t.id, t.name, tt.created_at
			FROM transaction_tags tt
			INNER JOIN tags t ON tt.tag_id = t.id
			WHERE tt.transaction_id = $1 AND t.deleted_at IS NULL
			ORDER BY t.name ASC
			LIMIT $2 OFFSET $3`

	rows, err := ttr.pgx.Query(ctx, sql, transactionID, pageSize, offset)
	if err != nil {
		return models.ListTransactionTagsResponseModel{}, huma.Error400BadRequest("Unable to query transaction tags", err)
	}
	defer rows.Close()

	var items []models.TransactionTagModel
	for rows.Next() {
		var item models.TransactionTagModel
		err := rows.Scan(&item.TransactionID, &item.TagID, &item.TagName, &item.CreatedAt)
		if err != nil {
			return models.ListTransactionTagsResponseModel{}, huma.Error400BadRequest("Unable to scan transaction tag data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListTransactionTagsResponseModel{}, huma.Error400BadRequest("Error reading transaction tag rows", err)
	}

	if items == nil {
		items = []models.TransactionTagModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + pageSize - 1) / pageSize
	}

	return models.ListTransactionTagsResponseModel{
		Data:       items,
		PageNumber: pageNumber,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get returns a single transaction tag by ID
func (ttr TransactionTagRepository) Get(ctx context.Context, transactionID int64, tagID int64) (models.TransactionTagModel, error) {
	var data models.TransactionTagModel

	sql := `SELECT tt.transaction_id, t.id, t.name, tt.created_at
			FROM transaction_tags tt
			INNER JOIN tags t ON tt.tag_id = t.id
			WHERE tt.transaction_id = $1 AND tt.tag_id = $2 AND t.deleted_at IS NULL`

	err := ttr.pgx.QueryRow(ctx, sql, transactionID, tagID).Scan(&data.TransactionID, &data.TagID, &data.TagName, &data.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTagModel{}, huma.Error404NotFound("Transaction tag not found")
		}
		return models.TransactionTagModel{}, huma.Error400BadRequest("Unable to query transaction tag", err)
	}

	return data, nil
}

// Create adds a tag to a transaction
func (ttr TransactionTagRepository) Create(ctx context.Context, payload models.CreateTransactionTagRequestModel) (models.CreateTransactionTagResponseModel, error) {
	var data models.TransactionTagModel

	// Insert and get tag details
	sql := `INSERT INTO transaction_tags (transaction_id, tag_id)
			VALUES ($1, $2)
			ON CONFLICT (transaction_id, tag_id) DO NOTHING
			RETURNING (SELECT transaction_id FROM transaction_tags WHERE transaction_id = $1 AND tag_id = $2),
					  (SELECT $2),
					  (SELECT name FROM tags WHERE id = $2 AND deleted_at IS NULL),
					  (SELECT created_at FROM transaction_tags WHERE transaction_id = $1 AND tag_id = $2)`

	err := ttr.pgx.QueryRow(ctx, sql, payload.TransactionID, payload.TagID).Scan(&data.TransactionID, &data.TagID, &data.TagName, &data.CreatedAt)

	if err != nil {
		return models.CreateTransactionTagResponseModel{}, huma.Error400BadRequest("Unable to add tag to transaction", err)
	}

	return models.CreateTransactionTagResponseModel{TransactionTagModel: data}, nil
}

// Delete removes a tag from a transaction
func (ttr TransactionTagRepository) Delete(ctx context.Context, transactionID int64, tagID int64) error {
	sql := `DELETE FROM transaction_tags
			WHERE transaction_id = $1 AND tag_id = $2`

	cmdTag, err := ttr.pgx.Exec(ctx, sql, transactionID, tagID)
	if err != nil {
		return huma.Error400BadRequest("Unable to remove tag from transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction tag not found")
	}

	return nil
}

// DeleteByTransactionID removes all tags from a transaction
func (ttr TransactionTagRepository) DeleteByTransactionID(ctx context.Context, transactionID int64) error {
	sql := `DELETE FROM transaction_tags WHERE transaction_id = $1`

	_, err := ttr.pgx.Exec(ctx, sql, transactionID)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction tags", err)
	}

	return nil
}

// DeleteByTagID removes a tag from all transactions
func (ttr TransactionTagRepository) DeleteByTagID(ctx context.Context, tagID int64) error {
	sql := `DELETE FROM transaction_tags WHERE tag_id = $1`

	_, err := ttr.pgx.Exec(ctx, sql, tagID)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete tag from transactions", err)
	}

	return nil
}
