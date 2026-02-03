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

type TransactionRelationRepository struct {
	db DBQuerier
}

func NewTransactionRelationRepository(db DBQuerier) TransactionRelationRepository {
	return TransactionRelationRepository{db}
}

func (trr TransactionRelationRepository) GetPaged(ctx context.Context, q models.TransactionRelationsSearchModel) (models.TransactionRelationsPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	offset := (q.PageNumber - 1) * q.PageSize

	sql := `
		WITH filtered AS (
			SELECT id, source_transaction_id, related_transaction_id, relation_type, created_at, updated_at, deleted_at
			FROM transaction_relations
			WHERE source_transaction_id = $1 AND deleted_at IS NULL
		),
		counted AS (
			SELECT COUNT(*) AS total_count FROM filtered
		)
		SELECT
			f.id,
			f.source_transaction_id,
			f.related_transaction_id,
			f.relation_type,
			f.created_at,
			f.updated_at,
			f.deleted_at,
			c.total_count
		FROM filtered f
		CROSS JOIN counted c
		ORDER BY f.created_at DESC
		LIMIT $2 OFFSET $3
	`

	queryStart := time.Now()
	rows, err := trr.db.Query(ctx, sql, q.SourceTransactionID, q.PageSize, offset)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionRelationsPagedModel{}, huma.Error500InternalServerError("Unable to query transaction relations", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transaction_relations", time.Since(queryStart).Seconds())

	var items []models.TransactionRelationModel
	var totalCount int
	for rows.Next() {
		var item models.TransactionRelationModel
		if err := rows.Scan(
			&item.ID, &item.SourceTransactionID, &item.RelatedTransactionID, &item.RelationType, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&totalCount,
		); err != nil {
			return models.TransactionRelationsPagedModel{}, huma.Error500InternalServerError("Unable to scan transaction relation data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TransactionRelationsPagedModel{}, huma.Error500InternalServerError("Error reading transaction relation rows", err)
	}

	if items == nil {
		items = []models.TransactionRelationModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + q.PageSize - 1) / q.PageSize
	}

	return models.TransactionRelationsPagedModel{
		Items:      items,
		PageNumber: q.PageNumber,
		PageSize:   q.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (trr TransactionRelationRepository) GetDetail(ctx context.Context, p models.TransactionRelationGetModel) (models.TransactionRelationModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	query := `
		SELECT id, source_transaction_id, related_transaction_id, relation_type, created_at, updated_at, deleted_at
		FROM transaction_relations
		WHERE id = $1 
		AND source_transaction_id = $2
		AND deleted_at IS NULL
		`

	queryStart := time.Now()
	var item models.TransactionRelationModel
	err := trr.db.QueryRow(ctx, query, p.RelationID, p.SourceTransactionID).Scan(
		&item.ID, &item.SourceTransactionID, &item.RelatedTransactionID, &item.RelationType, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.TransactionRelationModel{}, huma.Error404NotFound("Transaction relation not found")
	}
	if err != nil {
		observability.RecordError("database")
		return models.TransactionRelationModel{}, huma.Error500InternalServerError("Unable to query transaction relation", err)
	}
	observability.RecordQueryDuration("SELECT", "transaction_relations", time.Since(queryStart).Seconds())

	return item, nil
}

func (trr TransactionRelationRepository) Create(ctx context.Context, p models.CreateTransactionRelationModel) (models.TransactionRelationModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		WITH source_check AS (
			SELECT 1 FROM transactions WHERE id = $1 AND deleted_at IS NULL
		),
		related_check AS (
			SELECT 1 FROM transactions WHERE id = $2 AND deleted_at IS NULL
		),
		duplicate_check AS (
			SELECT 1 FROM transaction_relations
			WHERE source_transaction_id = $1 AND related_transaction_id = $2 AND deleted_at IS NULL
		),
		validation AS (
			SELECT
				CASE 
					WHEN (SELECT COUNT(*) FROM source_check) = 0 THEN 'source_not_found'
					WHEN (SELECT COUNT(*) FROM related_check) = 0 THEN 'related_not_found'
					WHEN (SELECT COUNT(*) FROM duplicate_check) > 0 THEN 'duplicate_exists'
					ELSE 'valid'
				END as status
		)
		SELECT status FROM validation
	`

	queryStart := time.Now()
	var validationStatus string
	err := trr.db.QueryRow(ctx, sql, p.SourceTransactionID, p.RelatedTransactionID).Scan(&validationStatus)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionRelationModel{}, huma.Error500InternalServerError("Unable to validate transaction relation", err)
	}
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	switch validationStatus {
	case "source_not_found":
		return models.TransactionRelationModel{}, huma.Error404NotFound("Source transaction not found")
	case "related_not_found":
		return models.TransactionRelationModel{}, huma.Error404NotFound("Related transaction not found")
	case "duplicate_exists":
		return models.TransactionRelationModel{}, huma.Error400BadRequest("Transaction relation already exists", nil)
	}

	var ID int64
	var srcID int64
	insertSQL := `
		INSERT INTO transaction_relations (source_transaction_id, related_transaction_id, relation_type)
		VALUES ($1, $2, $3)
		RETURNING id, source_transaction_id`

	queryStart2 := time.Now()
	insertErr := trr.db.QueryRow(
		ctx,
		insertSQL,
		p.SourceTransactionID,
		p.RelatedTransactionID,
		p.RelationType,
	).Scan(&ID, &srcID)

	if insertErr != nil {
		observability.RecordError("database")
		return models.TransactionRelationModel{}, huma.Error500InternalServerError("Unable to create transaction relation", insertErr)
	}
	observability.RecordQueryDuration("INSERT", "transaction_relations", time.Since(queryStart2).Seconds())

	return trr.GetDetail(ctx, models.TransactionRelationGetModel{
		SourceTransactionID: srcID,
		RelationID:          ID,
	})
}

func (trr TransactionRelationRepository) Delete(ctx context.Context, p models.DeleteTransactionRelationModel) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE transaction_relations
		SET deleted_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND source_transaction_id = $2 AND deleted_at IS NULL`

	queryStart := time.Now()
	cmdTag, err := trr.db.Exec(ctx, sql, p.RelationID, p.SourceTransactionID)
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to delete transaction relation", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction relation not found")
	}
	observability.RecordQueryDuration("DELETE", "transaction_relations", time.Since(queryStart).Seconds())

	return nil
}
