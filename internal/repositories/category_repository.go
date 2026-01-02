package repositories

import (
	"context"
	"errors"
	"fmt"

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

	// Count total items with filters
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM categories %s", whereClause)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedCategorySchema{}, fmt.Errorf("count categories: %w", err)
	}

	// Build ORDER BY clause and calculate pagination
	validColumns := map[string]string{
		"name":      "name",
		"type":      "type",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)
	offset := (params.PageNumber - 1) * params.PageSize
	limitIdx := qb.NextArgIndex()

	// Query with pagination
	sql := fmt.Sprintf(`SELECT id, name, type, note, created_at, updated_at, deleted_at 
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
