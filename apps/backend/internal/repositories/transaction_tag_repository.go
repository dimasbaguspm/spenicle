package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/jackc/pgx/v5"
)

type TransactionTagRepository struct {
	db DBQuerier
}

func NewTransactionTagRepository(db DBQuerier) TransactionTagRepository {
	return TransactionTagRepository{db}
}

func (ttr TransactionTagRepository) GetPaged(ctx context.Context, q models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	offset := (q.PageNumber - 1) * q.PageSize

	sql := `
		WITH filtered AS (
			SELECT tt.id, tt.transaction_id, t.id as tag_id, t.name, tt.created_at
			FROM transaction_tags tt
			INNER JOIN tags t ON tt.tag_id = t.id
			WHERE tt.transaction_id = $1
				AND t.deleted_at IS NULL
		),
		counted AS (
			SELECT COUNT(*) AS total_count FROM filtered
		)
		SELECT
			f.id,
			f.transaction_id,
			f.tag_id,
			f.name,
			f.created_at,
			c.total_count
		FROM filtered f
		CROSS JOIN counted c
		ORDER BY f.name ASC
		LIMIT $2 OFFSET $3
	`

	queryStart := time.Now()
	rows, err := ttr.db.Query(ctx, sql, q.TransactionID, q.PageSize, offset)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionTagsPagedModel{}, huma.Error500InternalServerError("Unable to query transaction tags", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transaction_tags", time.Since(queryStart).Seconds())

	var items []models.TransactionTagModel
	var totalCount int
	for rows.Next() {
		var item models.TransactionTagModel
		err := rows.Scan(&item.ID, &item.TransactionID, &item.TagID, &item.TagName, &item.CreatedAt, &totalCount)
		if err != nil {
			return models.TransactionTagsPagedModel{}, huma.Error500InternalServerError("Unable to scan transaction tag data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TransactionTagsPagedModel{}, huma.Error500InternalServerError("Error reading transaction tag rows", err)
	}

	if items == nil {
		items = []models.TransactionTagModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + q.PageSize - 1) / q.PageSize
	}

	return models.TransactionTagsPagedModel{
		Items:      items,
		PageNumber: q.PageNumber,
		PageSize:   q.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (ttr TransactionTagRepository) GetDetail(ctx context.Context, ID int64) (models.TransactionTagModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var data models.TransactionTagModel

	sql := `
		SELECT
			t.id,
			tt.transaction_id,
			t.id as tag_id,
			t.name,
			tt.created_at
		FROM transaction_tags tt
		INNER JOIN tags t ON tt.tag_id = t.id
		WHERE tt.id = $1 AND t.deleted_at IS NULL`

	queryStart := time.Now()
	err := ttr.db.QueryRow(ctx, sql, ID).Scan(&data.ID, &data.TransactionID, &data.TagID, &data.TagName, &data.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTagModel{}, huma.Error404NotFound("Transaction tag not found")
		}
		observability.RecordError("database")
		return models.TransactionTagModel{}, huma.Error500InternalServerError("Unable to query transaction tag", err)
	}
	observability.RecordQueryDuration("SELECT", "transaction_tags", time.Since(queryStart).Seconds())

	return data, nil
}

func (ttr TransactionTagRepository) Create(ctx context.Context, p models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var ID int64

	insertSQL := `
		INSERT INTO transaction_tags (
			transaction_id,
			tag_id
		)
		VALUES ($1, $2)
		ON CONFLICT (transaction_id, tag_id) DO NOTHING`

	queryStart := time.Now()
	_, err := ttr.db.Exec(ctx, insertSQL, p.TransactionID, p.TagID)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionTagModel{}, huma.Error500InternalServerError("Unable to add tag to transaction", err)
	}
	observability.RecordQueryDuration("INSERT", "transaction_tags", time.Since(queryStart).Seconds())

	selectSQL := `SELECT id FROM transaction_tags WHERE transaction_id = $1 AND tag_id = $2`
	err = ttr.db.QueryRow(ctx, selectSQL, p.TransactionID, p.TagID).Scan(&ID)

	if err != nil {
		observability.RecordError("database")
		return models.TransactionTagModel{}, huma.Error500InternalServerError("Unable to add tag to transaction", err)
	}

	return ttr.GetDetail(ctx, ID)
}

func (ttr TransactionTagRepository) Delete(ctx context.Context, transactionID, tagID int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		DELETE FROM transaction_tags
		WHERE transaction_id = $1 AND tag_id = $2`

	queryStart := time.Now()
	cmdTag, err := ttr.db.Exec(ctx, sql, transactionID, tagID)
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to remove tag from transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction tag association not found")
	}
	observability.RecordQueryDuration("DELETE", "transaction_tags", time.Since(queryStart).Seconds())

	return nil
}
