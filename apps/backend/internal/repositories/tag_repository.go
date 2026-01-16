package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TagRepository struct {
	pgx *pgxpool.Pool
}

func NewTagRepository(pgx *pgxpool.Pool) TagRepository {
	return TagRepository{pgx}
}

func (tr TagRepository) GetPaged(ctx context.Context, query models.TagsSearchModel) (models.TagsPagedModel, error) {
	sortByMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]
	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered_tags AS (
			SELECT 
				id, name, color, created_at, updated_at, deleted_at,
				COUNT(*) OVER() as total_count
			FROM tags
			WHERE deleted_at IS NULL
				AND ($1::text IS NULL OR $1::text = '' OR name ILIKE '%' || $1::text || '%')
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3
		)
		SELECT
			id,
			name,
			color,
			created_at,
			updated_at,
			deleted_at,
			total_count
		FROM filtered_tags`

	rows, err := tr.pgx.Query(ctx, sql, query.Name, query.PageSize, offset)
	if err != nil {
		return models.TagsPagedModel{}, huma.Error400BadRequest("Unable to query tags", err)
	}
	defer rows.Close()

	var items []models.TagModel
	var totalCount int
	for rows.Next() {
		var item models.TagModel
		err := rows.Scan(&item.ID, &item.Name, &item.Color, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt, &totalCount)
		if err != nil {
			return models.TagsPagedModel{}, huma.Error400BadRequest("Unable to scan tag data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TagsPagedModel{}, huma.Error400BadRequest("Error reading tag rows", err)
	}

	if items == nil {
		items = []models.TagModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.TagsPagedModel{
		Items:      items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (tr TagRepository) GetDetail(ctx context.Context, id int64) (models.TagModel, error) {
	var data models.TagModel

	sql := `
		SELECT
			id, name, color, created_at, updated_at, deleted_at
		FROM tags
		WHERE id = $1
			AND deleted_at IS NULL`

	err := tr.pgx.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.Color, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TagModel{}, huma.Error404NotFound("Tag not found")
		}
		return models.TagModel{}, huma.Error400BadRequest("Unable to query tag", err)
	}

	return data, nil
}

func (tr TagRepository) Create(ctx context.Context, payload models.CreateTagModel) (models.TagModel, error) {
	var ID int64

	sql := `INSERT INTO tags (name, color)
			VALUES ($1, $2)
			RETURNING id`

	err := tr.pgx.QueryRow(ctx, sql, payload.Name, payload.Color).Scan(&ID)

	if err != nil {
		return models.TagModel{}, huma.Error400BadRequest("Unable to create tag", err)
	}

	return tr.GetDetail(ctx, ID)
}

func (tr TagRepository) Update(ctx context.Context, id int64, payload models.UpdateTagModel) (models.TagModel, error) {
	var ID int64

	sql := `
		UPDATE tags
		SET name = COALESCE($1, name),
			color = COALESCE($2, color),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND deleted_at IS NULL
		RETURNING id
	`

	err := tr.pgx.QueryRow(ctx, sql, payload.Name, payload.Color, id).Scan(&ID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TagModel{}, huma.Error404NotFound("Tag not found")
		}
		return models.TagModel{}, huma.Error400BadRequest("Unable to update tag", err)
	}

	return tr.GetDetail(ctx, ID)
}

func (tr TagRepository) Delete(ctx context.Context, id int64) error {
	sql := `
		UPDATE tags
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1
			AND deleted_at IS NULL`

	cmdTag, err := tr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete tag", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Tag not found")
	}

	return nil
}
