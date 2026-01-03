package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
	"github.com/jackc/pgx/v5"
)

var (
	ErrCategoryNotFound    = errors.New("category not found")
	ErrInvalidCategoryData = errors.New("invalid category data")

	CategoryTypeExpense  = "expense"
	CategoryTypeIncome   = "income"
	CategoryTypeTransfer = "transfer"
)

type CategoryRepository struct {
	db DB
}

func NewCategoryRepository(db DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

// List returns a paginated list of categories based on search params.
// Only returns non-deleted categories (soft delete filter).
func (r *CategoryRepository) List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
	qb := utils.QueryBuilder()
	qb.Add("deleted_at IS NULL")
	qb.AddInFilter("id", params.ID)
	qb.AddLikeFilter("name", params.Name)
	qb.AddInFilterString("type", params.Type)

	// Add archived filter
	if params.Archived != "" {
		if params.Archived == "true" {
			qb.Add("archived_at IS NOT NULL")
		} else if params.Archived == "false" {
			qb.Add("archived_at IS NULL")
		}
	}

	// Count total items with filters
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM categories %s", whereClause)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedCategorySchema{}, fmt.Errorf("count categories: %w", err)
	}

	// Build ORDER BY clause and calculate pagination
	validColumns := map[string]string{
		"name":         "name",
		"type":         "type",
		"displayOrder": "display_order",
		"createdAt":    "created_at",
		"updatedAt":    "updated_at",
	}
	orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)
	offset := (params.PageNumber - 1) * params.PageSize
	limitIdx := qb.NextArgIndex()

	// Query with pagination including new fields
	sql := fmt.Sprintf(`SELECT id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at 
	        FROM categories 
	        %s 
	        %s
	        LIMIT $%d OFFSET $%d`, whereClause, orderBy, limitIdx, limitIdx+1)

	args = append(args, params.PageSize, offset)
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.PaginatedCategorySchema{}, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	pcs := schemas.PaginatedCategorySchema{}
	return pcs.FromRows(rows, totalCount, params)
}

// Get returns a single category by id.
// Returns ErrCategoryNotFound if category doesn't exist or is soft deleted.
func (r *CategoryRepository) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	// Performance: Add WHERE clause for soft delete filter (allows index usage)
	sql := `SELECT id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at 
	        FROM categories 
	        WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.QueryRow(ctx, sql, id).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
		&category.Icon,
		&category.IconColor,
		&category.DisplayOrder,
		&category.ArchivedAt,
		&category.CreatedAt,
		&category.UpdatedAt,
		&category.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.CategorySchema{}, ErrCategoryNotFound
		}
		return schemas.CategorySchema{}, fmt.Errorf("get category: %w", err)
	}

	return category, nil
}

// Create inserts a new category and returns the created record.
// Performance: Uses RETURNING to fetch created record in single query.
// Auto-calculates display_order as max(display_order) + 1.
func (r *CategoryRepository) Create(ctx context.Context, in schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	sql := `INSERT INTO categories (name, type, note, icon, icon_color, display_order) 
	        VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(display_order) + 1 FROM categories), 0)) 
	        RETURNING id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, in.Name, in.Type, in.Note, in.Icon, in.IconColor).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
		&category.Icon,
		&category.IconColor,
		&category.DisplayOrder,
		&category.ArchivedAt,
		&category.CreatedAt,
		&category.UpdatedAt,
		&category.DeletedAt,
	)

	if err != nil {
		return schemas.CategorySchema{}, fmt.Errorf("create category: %w", err)
	}

	return category, nil
}

// Update modifies an existing category and returns the updated record.
// Returns ErrCategoryNotFound if category doesn't exist or is soft deleted.
// Performance: Uses dynamic field updates, RETURNING for single query.
func (r *CategoryRepository) Update(ctx context.Context, id int64, in schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	// Build dynamic update query based on provided fields
	updateFields := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{id}
	paramIdx := 2 // Start at $2 since $1 is used for id in WHERE clause

	if in.Name != nil {
		updateFields = append(updateFields, fmt.Sprintf("name = $%d", paramIdx))
		args = append(args, *in.Name)
		paramIdx++
	}
	if in.Type != nil {
		updateFields = append(updateFields, fmt.Sprintf("type = $%d", paramIdx))
		args = append(args, *in.Type)
		paramIdx++
	}
	if in.Note != nil {
		updateFields = append(updateFields, fmt.Sprintf("note = $%d", paramIdx))
		args = append(args, *in.Note)
		paramIdx++
	}
	if in.Icon != nil {
		updateFields = append(updateFields, fmt.Sprintf("icon = $%d", paramIdx))
		args = append(args, *in.Icon)
		paramIdx++
	}
	if in.IconColor != nil {
		updateFields = append(updateFields, fmt.Sprintf("icon_color = $%d", paramIdx))
		args = append(args, *in.IconColor)
		paramIdx++
	}
	if in.ArchivedAt != nil {
		if *in.ArchivedAt == "" || *in.ArchivedAt == "null" {
			updateFields = append(updateFields, "archived_at = NULL")
		} else {
			updateFields = append(updateFields, fmt.Sprintf("archived_at = $%d", paramIdx))
			args = append(args, *in.ArchivedAt)
			paramIdx++
		}
	}

	sql := fmt.Sprintf(`UPDATE categories 
	        SET %s 
	        WHERE id = $1 AND deleted_at IS NULL 
	        RETURNING id, name, type, note, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`,
		strings.Join(updateFields, ", "))

	err := r.db.QueryRow(ctx, sql, args...).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
		&category.Icon,
		&category.IconColor,
		&category.DisplayOrder,
		&category.ArchivedAt,
		&category.CreatedAt,
		&category.UpdatedAt,
		&category.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.CategorySchema{}, ErrCategoryNotFound
		}
		return schemas.CategorySchema{}, fmt.Errorf("update category: %w", err)
	}

	return category, nil
}

// Delete performs a soft delete by setting deleted_at.
// Returns ErrCategoryNotFound if category doesn't exist or is already deleted.
// Performance: Prevents deleting already deleted records.
func (r *CategoryRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE categories 
	        SET deleted_at = CURRENT_TIMESTAMP 
	        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}

	// Check if any row was affected
	if result.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}

	return nil
}

// Reorder atomically updates the display_order for multiple categories.
// Uses a transaction to ensure atomicity.
func (r *CategoryRepository) Reorder(ctx context.Context, items []schemas.CategoryReorderItemSchema) error {
	// Build batch update query using CASE statement for atomic operation
	if len(items) == 0 {
		return nil
	}

	// Build query with placeholders
	sql := `UPDATE categories 
	        SET display_order = CASE id `

	args := []interface{}{}
	ids := []int64{}
	argIdx := 1

	for _, item := range items {
		sql += fmt.Sprintf("WHEN $%d THEN $%d ", argIdx, argIdx+1)
		args = append(args, item.ID, item.DisplayOrder)
		ids = append(ids, item.ID)
		argIdx += 2
	}

	sql += "END, updated_at = CURRENT_TIMESTAMP WHERE id IN ("
	for i, id := range ids {
		if i > 0 {
			sql += ", "
		}
		sql += fmt.Sprintf("$%d", argIdx)
		args = append(args, id)
		argIdx++
	}
	sql += ") AND deleted_at IS NULL"

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("reorder categories: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}

	return nil
}
