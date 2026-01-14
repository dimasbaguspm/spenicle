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

// List returns a paginated list of tags
func (tr TagRepository) List(ctx context.Context, query models.ListTagsRequestModel) (models.ListTagsResponseModel, error) {
	// Enforce page size limits
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 10
	}
	if query.PageNumber <= 0 {
		query.PageNumber = 1
	}

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

	sortColumn, ok := sortByMap[query.SortBy]
	if !ok {
		sortColumn = "created_at"
	}
	sortOrder, ok := sortOrderMap[query.SortOrder]
	if !ok {
		sortOrder = "DESC"
	}

	offset := (query.PageNumber - 1) * query.PageSize
	searchPattern := "%" + query.Name + "%"

	countSQL := `SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL`
	var totalCount int
	if err := tr.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListTagsResponseModel{}, huma.Error400BadRequest("Unable to count tags", err)
	}

	sql := `SELECT id, name, created_at, updated_at, deleted_at
			FROM tags
			WHERE deleted_at IS NULL
			AND (name ILIKE $1 OR $1 = '%%')
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3`

	rows, err := tr.pgx.Query(ctx, sql, searchPattern, query.PageSize, offset)
	if err != nil {
		return models.ListTagsResponseModel{}, huma.Error400BadRequest("Unable to query tags", err)
	}
	defer rows.Close()

	var items []models.TagModel
	for rows.Next() {
		var item models.TagModel
		err := rows.Scan(&item.ID, &item.Name, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt)
		if err != nil {
			return models.ListTagsResponseModel{}, huma.Error400BadRequest("Unable to scan tag data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListTagsResponseModel{}, huma.Error400BadRequest("Error reading tag rows", err)
	}

	if items == nil {
		items = []models.TagModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.ListTagsResponseModel{
		Data:       items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get returns a single tag by ID
func (tr TagRepository) Get(ctx context.Context, id int64) (models.TagModel, error) {
	var data models.TagModel

	sql := `SELECT id, name, created_at, updated_at, deleted_at
			FROM tags
			WHERE id = $1 AND deleted_at IS NULL`

	err := tr.pgx.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TagModel{}, huma.Error404NotFound("Tag not found")
		}
		return models.TagModel{}, huma.Error400BadRequest("Unable to query tag", err)
	}

	return data, nil
}

// Create creates a new tag
func (tr TagRepository) Create(ctx context.Context, payload models.CreateTagRequestModel) (models.CreateTagResponseModel, error) {
	var data models.TagModel

	sql := `INSERT INTO tags (name)
			VALUES ($1)
			RETURNING id, name, created_at, updated_at, deleted_at`

	err := tr.pgx.QueryRow(ctx, sql, payload.Name).Scan(&data.ID, &data.Name, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		return models.CreateTagResponseModel{}, huma.Error400BadRequest("Unable to create tag", err)
	}

	return models.CreateTagResponseModel{TagModel: data}, nil
}

// Update updates an existing tag
func (tr TagRepository) Update(ctx context.Context, id int64, payload models.UpdateTagRequestModel) (models.UpdateTagResponseModel, error) {
	var data models.TagModel

	sql := `UPDATE tags
			SET name = COALESCE($1, name),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND deleted_at IS NULL
			RETURNING id, name, created_at, updated_at, deleted_at`

	err := tr.pgx.QueryRow(ctx, sql, payload.Name, id).Scan(&data.ID, &data.Name, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateTagResponseModel{}, huma.Error404NotFound("Tag not found")
		}
		return models.UpdateTagResponseModel{}, huma.Error400BadRequest("Unable to update tag", err)
	}

	return models.UpdateTagResponseModel{TagModel: data}, nil
}

// Delete soft deletes a tag
func (tr TagRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE tags
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := tr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete tag", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Tag not found")
	}

	return nil
}
