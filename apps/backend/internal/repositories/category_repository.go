package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryRepository struct {
	pgx *pgxpool.Pool
}

func NewCategoryRepository(pgx *pgxpool.Pool) CategoryRepository {
	return CategoryRepository{pgx}
}

// List returns a paginated list of categories
func (cr CategoryRepository) List(ctx context.Context, query models.ListCategoriesRequestModel) (models.ListCategoriesResponseModel, error) {
	// Enforce page size limits
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 10
	}
	if query.PageNumber <= 0 {
		query.PageNumber = 1
	}

	sortByMap := map[string]string{
		"name":         "name",
		"type":         "type",
		"displayOrder": "display_order",
		"createdAt":    "created_at",
		"updatedAt":    "updated_at",
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

	countSQL := `SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL`
	var totalCount int
	if err := cr.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListCategoriesResponseModel{}, huma.Error400BadRequest("Unable to count categories", err)
	}

	sql := `SELECT id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at
			FROM categories
			WHERE deleted_at IS NULL
			AND (name ILIKE $1 OR $1 = '%%')
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3`

	rows, err := cr.pgx.Query(ctx, sql, searchPattern, query.PageSize, offset)
	if err != nil {
		return models.ListCategoriesResponseModel{}, huma.Error400BadRequest("Unable to query categories", err)
	}
	defer rows.Close()

	var items []models.CategoryModel
	for rows.Next() {
		var item models.CategoryModel
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.Note, &item.Icon, &item.IconColor, &item.DisplayOrder, &item.ArchivedAt, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt)
		if err != nil {
			return models.ListCategoriesResponseModel{}, huma.Error400BadRequest("Unable to scan category data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListCategoriesResponseModel{}, huma.Error400BadRequest("Error reading category rows", err)
	}

	if items == nil {
		items = []models.CategoryModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.ListCategoriesResponseModel{
		Data:       items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (cr CategoryRepository) Get(ctx context.Context, id int64) (models.CategoryModel, error) {
	var data models.CategoryModel

	sql := `SELECT id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at
			FROM categories
			WHERE id = $1 AND deleted_at IS NULL`

	err := cr.pgx.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.CategoryModel{}, huma.Error404NotFound("Category not found")
		}
		return models.CategoryModel{}, huma.Error400BadRequest("Unable to query category", err)
	}

	return data, nil
}

func (cr CategoryRepository) Create(ctx context.Context, payload models.CreateCategoryRequestModel) (models.CreateCategoryResponseModel, error) {
	var data models.CategoryModel

	sql := `INSERT INTO categories (name, type, note, icon, icon_color, display_order)
			VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(display_order) + 1 FROM categories), 0))
			RETURNING id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := cr.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Icon, payload.IconColor).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		return models.CreateCategoryResponseModel{}, huma.Error400BadRequest("Unable to create category", err)
	}

	return models.CreateCategoryResponseModel{CategoryModel: data}, nil
}

func (cr CategoryRepository) Update(ctx context.Context, id int64, payload models.UpdateCategoryRequestModel) (models.UpdateCategoryResponseModel, error) {
	var data models.CategoryModel

	sql := `UPDATE categories
			SET name = COALESCE($1, name),
				type = COALESCE($2, type),
				note = COALESCE($3, note),
				icon = COALESCE($4, icon),
				icon_color = COALESCE($5, icon_color),
				archived_at = CASE
					WHEN $6::text = '' OR $6::text = 'null' THEN NULL
					WHEN $6::text IS NOT NULL THEN CURRENT_TIMESTAMP
					ELSE archived_at
				END,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $7 AND deleted_at IS NULL
			RETURNING id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := cr.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Icon, payload.IconColor, payload.ArchivedAt, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateCategoryResponseModel{}, huma.Error404NotFound("Category not found")
		}
		return models.UpdateCategoryResponseModel{}, huma.Error400BadRequest("Unable to update category", err)
	}

	return models.UpdateCategoryResponseModel{CategoryModel: data}, nil
}

func (cr CategoryRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE categories
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := cr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete category", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Category not found")
	}

	return nil
}

func (cr CategoryRepository) Reorder(ctx context.Context, items []models.ReorderCategoryItemModel) error {
	if len(items) == 0 {
		return nil
	}

	var caseExpr string
	for i, item := range items {
		if i > 0 {
			caseExpr += " "
		}
		caseExpr += fmt.Sprintf("WHEN id = %d THEN %d", item.ID, item.DisplayOrder)
	}

	sql := `UPDATE categories
			SET display_order = CASE ` + caseExpr + ` END,
				updated_at = CURRENT_TIMESTAMP
			WHERE deleted_at IS NULL`

	_, err := cr.pgx.Exec(ctx, sql)
	if err != nil {
		return huma.Error400BadRequest("Unable to reorder categories", err)
	}

	return nil
}
