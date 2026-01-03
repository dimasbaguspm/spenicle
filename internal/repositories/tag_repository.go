package repositories

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type TagRepository struct {
	db DB
}

func NewTagRepository(db DB) *TagRepository {
	return &TagRepository{db: db}
}

// List returns paginated tags with optional search
func (r *TagRepository) List(ctx context.Context, params schemas.SearchParamTagSchema) (schemas.PaginatedTagSchema, error) {
	qb := utils.QueryBuilder()

	// Apply search filter
	if params.Search != "" {
		qb.AddLikeFilter("name", params.Search)
	}

	// Get total count
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM tags %s", whereClause)
	var totalItems int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalItems); err != nil {
		return schemas.PaginatedTagSchema{}, fmt.Errorf("count tags: %w", err)
	}

	// Apply pagination
	offset := (params.Page - 1) * params.Limit
	limitIdx := qb.NextArgIndex()

	// Execute query
	sql := fmt.Sprintf(`SELECT id, name, created_at FROM tags %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		whereClause, limitIdx, limitIdx+1)
	args = append(args, params.Limit, offset)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.PaginatedTagSchema{}, fmt.Errorf("list tags: %w", err)
	}
	defer rows.Close()

	var tags []schemas.TagSchema
	for rows.Next() {
		var tag schemas.TagSchema
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt); err != nil {
			return schemas.PaginatedTagSchema{}, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	if tags == nil {
		tags = []schemas.TagSchema{}
	}

	totalPages := (totalItems + params.Limit - 1) / params.Limit

	return schemas.PaginatedTagSchema{
		Data:       tags,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalItems: totalItems,
		TotalPages: totalPages,
	}, nil
}

// Get returns a single tag by ID
func (r *TagRepository) Get(ctx context.Context, id int) (schemas.TagSchema, error) {
	sql := `SELECT id, name, created_at FROM tags WHERE id = $1`

	var tag schemas.TagSchema
	err := r.db.QueryRow(ctx, sql, id).Scan(&tag.ID, &tag.Name, &tag.CreatedAt)
	if err != nil {
		return schemas.TagSchema{}, fmt.Errorf("get tag: %w", err)
	}

	return tag, nil
}

// GetByName returns a tag by name (case-insensitive)
func (r *TagRepository) GetByName(ctx context.Context, name string) (schemas.TagSchema, error) {
	sql := `SELECT id, name, created_at FROM tags WHERE LOWER(name) = LOWER($1)`

	var tag schemas.TagSchema
	err := r.db.QueryRow(ctx, sql, name).Scan(&tag.ID, &tag.Name, &tag.CreatedAt)
	if err != nil {
		return schemas.TagSchema{}, fmt.Errorf("get tag by name: %w", err)
	}

	return tag, nil
}

// Create creates a new tag
func (r *TagRepository) Create(ctx context.Context, input schemas.CreateTagSchema) (schemas.TagSchema, error) {
	sql := `
		INSERT INTO tags (name, created_at)
		VALUES ($1, NOW())
		RETURNING id, name, created_at
	`

	var tag schemas.TagSchema
	err := r.db.QueryRow(ctx, sql, input.Name).Scan(&tag.ID, &tag.Name, &tag.CreatedAt)
	if err != nil {
		return schemas.TagSchema{}, fmt.Errorf("create tag: %w", err)
	}

	return tag, nil
}

// Delete deletes a tag (this will cascade to transaction_tags)
func (r *TagRepository) Delete(ctx context.Context, id int) error {
	sql := `DELETE FROM tags WHERE id = $1`

	result, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("delete tag: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("tag not found")
	}

	return nil
}
