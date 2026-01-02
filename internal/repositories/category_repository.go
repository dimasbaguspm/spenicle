package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/jackc/pgx/v5"
)

var (
	ErrCategoryNotFound    = errors.New("category not found")
	ErrInvalidCategoryData = errors.New("invalid category data")
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
	countSQL := "SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL"
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return schemas.PaginatedCategorySchema{}, fmt.Errorf("count categories: %w", err)
	}

	// Build ORDER BY clause based on params
	orderBy := r.buildOrderByClause(params.OrderBy, params.OrderDirection)

	// Query only non-deleted categories with pagination
	// Performance: Select specific columns, use WHERE for soft delete filter
	sql := fmt.Sprintf(`SELECT id, name, type, note, created_at, updated_at, deleted_at 
	        FROM categories 
	        WHERE deleted_at IS NULL 
	        %s
	        LIMIT $1 OFFSET $2`, orderBy)
	offset := (params.PageNumber - 1) * params.PageSize
	rows, err := r.db.Query(ctx, sql, params.PageSize, offset)
	if err != nil {
		return schemas.PaginatedCategorySchema{}, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	pcs := schemas.PaginatedCategorySchema{}
	return pcs.FromRows(rows, totalCount, params)
}

// buildOrderByClause constructs a safe ORDER BY clause from user input.
// Maps camelCase field names to database column names and validates direction.
// Returns a safe SQL ORDER BY clause or defaults to "ORDER BY created_at DESC".
func (r *CategoryRepository) buildOrderByClause(orderBy, orderDirection string) string {
	// Map camelCase to database column names
	columnMap := map[string]string{
		"name":      "name",
		"type":      "type",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}

	// Get the database column name, default to created_at if invalid
	column, ok := columnMap[orderBy]
	if !ok || column == "" {
		column = "created_at"
	}

	// Validate direction, default to DESC if invalid
	direction := "DESC"
	if orderDirection == "asc" || orderDirection == "ASC" {
		direction = "ASC"
	}

	return fmt.Sprintf("ORDER BY %s %s", column, direction)
}

// Get returns a single category by id.
// Returns ErrCategoryNotFound if category doesn't exist or is soft deleted.
func (r *CategoryRepository) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	// Performance: Add WHERE clause for soft delete filter (allows index usage)
	sql := `SELECT id, name, type, note, created_at, updated_at, deleted_at 
	        FROM categories 
	        WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.QueryRow(ctx, sql, id).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
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
func (r *CategoryRepository) Create(ctx context.Context, in schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	sql := `INSERT INTO categories (name, type, note) 
	        VALUES ($1, $2, $3) 
	        RETURNING id, name, type, note, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, in.Name, in.Type, in.Note).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
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
// Performance: Uses COALESCE for partial updates, RETURNING for single query.
func (r *CategoryRepository) Update(ctx context.Context, id int64, in schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	var category schemas.CategorySchema
	// Add deleted_at check to prevent updating soft-deleted records
	sql := `UPDATE categories 
	        SET name = COALESCE($2, name), 
	            type = COALESCE($3, type), 
	            note = COALESCE($4, note), 
	            updated_at = CURRENT_TIMESTAMP 
	        WHERE id = $1 AND deleted_at IS NULL 
	        RETURNING id, name, type, note, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, id, in.Name, in.Type, in.Note).Scan(
		&category.ID,
		&category.Name,
		&category.Type,
		&category.Note,
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
