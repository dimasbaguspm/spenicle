package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryRepository struct {
	Pgx *pgxpool.Pool
}

func NewCategoryRepository(pgx *pgxpool.Pool) CategoryRepository {
	return CategoryRepository{Pgx: pgx}
}

func (cr CategoryRepository) GetPaged(ctx context.Context, query models.CategoriesSearchModel) (models.CategoriesPagedModel, error) {
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

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]
	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered_categories AS (
			SELECT 
				c.id, c.name, c.type, c.note, c.icon, c.icon_color, c.display_order, c.archived_at, c.created_at, c.updated_at,
				b.id as budget_id, b.period_start, b.period_end, b.template_id, b.amount_limit, b.account_id, b.category_id,
				COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = c.id AND t.date >= b.period_start AND t.date <= b.period_end AND t.deleted_at IS NULL), 0) as actual_amount,
				b.period_type, b.name as budget_name,
				COUNT(*) OVER() as total_count
			FROM categories c
			LEFT JOIN budgets b ON b.category_id = c.id AND b.status = 'active' AND b.period_start <= CURRENT_DATE AND b.period_end >= CURRENT_DATE AND b.deleted_at IS NULL
			WHERE c.deleted_at IS NULL
					AND (array_length($3::int8[], 1) IS NULL OR c.id = ANY($3::int8[]))
					AND ($5::text IS NULL OR $5::text = '' OR c.name ILIKE '%' || $5::text || '%')
					AND (array_length($4::text[], 1) IS NULL OR c.type = ANY($4::text[]))
					AND (
						$6::text IS NULL OR $6::text = '' OR
						($6::text = 'true' AND c.archived_at IS NOT NULL) OR
						($6::text = 'false' AND c.archived_at IS NULL)
					)
			ORDER BY c.` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
		)
		SELECT
			id,
			name,
			type,
			note,
			icon,
			icon_color,
			display_order,
			archived_at,
			created_at,
			updated_at,
			budget_id,
			period_start,
			period_end,
			template_id,
			amount_limit,
			account_id,
			category_id,
			actual_amount,
			period_type,
			budget_name,
			total_count
		FROM filtered_categories
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
		`

	var (
		ids   []int64
		types []string
	)

	if len(query.ID) > 0 {
		for _, id := range query.ID {
			ids = append(ids, int64(id))
		}
	}
	if len(query.Type) > 0 {
		types = query.Type
	}

	rows, err := cr.Pgx.Query(ctx, sql, query.PageSize, offset, ids, types, query.Name, query.Archived)
	if err != nil {
		return models.CategoriesPagedModel{}, huma.Error500InternalServerError("Unable to query categories", err)
	}
	defer rows.Close()

	var items []models.CategoryModel
	var totalCount int

	for rows.Next() {
		var item models.CategoryModel
		var budgetID *int64
		var periodStart *time.Time
		var periodEnd *time.Time
		var templateID *int64
		var amountLimit *int64
		var accountID *int64
		var categoryID *int64
		var actualAmount *int64
		var periodType *string
		var budgetName *string
		err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Type,
			&item.Note,
			&item.Icon,
			&item.IconColor,
			&item.DisplayOrder,
			&item.ArchivedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&budgetID,
			&periodStart,
			&periodEnd,
			&templateID,
			&amountLimit,
			&accountID,
			&categoryID,
			&actualAmount,
			&periodType,
			&budgetName,
			&totalCount)
		if err != nil {
			return models.CategoriesPagedModel{}, huma.Error500InternalServerError("Unable to scan category data", err)
		}
		if budgetID != nil {
			item.EmbeddedBudget = &models.EmbeddedBudget{
				ID:           *budgetID,
				TemplateID:   templateID,
				AccountID:    accountID,
				CategoryID:   categoryID,
				PeriodStart:  *periodStart,
				PeriodEnd:    *periodEnd,
				AmountLimit:  *amountLimit,
				ActualAmount: *actualAmount,
				PeriodType:   *periodType,
				Name:         *budgetName,
			}
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.CategoriesPagedModel{}, huma.Error500InternalServerError("Error reading category rows", err)
	}

	if items == nil {
		items = []models.CategoryModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.CategoriesPagedModel{
		Items:      items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
		TotalCount: totalCount,
	}, nil
}

func (cr CategoryRepository) GetDetail(ctx context.Context, id int64) (models.CategoryModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var data models.CategoryModel
	var budgetID *int64
	var periodStart *time.Time
	var periodEnd *time.Time
	var templateID *int64
	var amountLimit *int64
	var accountID *int64
	var categoryID *int64
	var actualAmount *int64
	var periodType *string
	var budgetName *string

	sql := `
		SELECT
			c.id, c.name, c.type, c.note, c.icon, c.icon_color, c.display_order, c.archived_at, c.created_at, c.updated_at, c.deleted_at,
			b.id as budget_id, b.period_start, b.period_end, b.template_id, b.amount_limit, b.account_id, b.category_id,
			COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id = c.id AND t.date >= b.period_start AND t.date <= b.period_end AND t.deleted_at IS NULL), 0) as actual_amount,
			b.period_type, b.name as budget_name
		FROM categories c
		LEFT JOIN budgets b ON b.category_id = c.id AND b.status = 'active' AND b.period_start <= CURRENT_DATE AND b.period_end >= CURRENT_DATE AND b.deleted_at IS NULL
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`
	err := cr.Pgx.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt, &budgetID, &periodStart, &periodEnd, &templateID, &amountLimit, &accountID, &categoryID, &actualAmount, &periodType, &budgetName)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.CategoryModel{}, huma.Error404NotFound("Category not found")
		}
		return models.CategoryModel{}, huma.Error500InternalServerError("Unable to query category", err)
	}

	if budgetID != nil {
		data.EmbeddedBudget = &models.EmbeddedBudget{
			ID:           *budgetID,
			TemplateID:   templateID,
			AccountID:    accountID,
			CategoryID:   categoryID,
			PeriodStart:  *periodStart,
			PeriodEnd:    *periodEnd,
			AmountLimit:  *amountLimit,
			ActualAmount: *actualAmount,
			PeriodType:   *periodType,
			Name:         *budgetName,
		}
	}

	return data, nil
}

func (cr CategoryRepository) Create(ctx context.Context, payload models.CreateCategoryModel) (models.CategoryModel, error) {
	var ID int64

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		INSERT INTO categories
			(name, type, note, icon, icon_color, display_order)
		VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT MAX(display_order) + 1 FROM categories WHERE deleted_at IS NULL), 0))
		RETURNING id
	`

	err := cr.Pgx.QueryRow(ctx, sql,
		payload.Name,
		payload.Type,
		payload.Note,
		payload.Icon,
		payload.IconColor).Scan(&ID)

	if err != nil {
		return models.CategoryModel{}, huma.Error500InternalServerError("Unable to create category", err)
	}

	return cr.GetDetail(ctx, ID)
}

func (cr CategoryRepository) Update(ctx context.Context, id int64, payload models.UpdateCategoryModel) (models.CategoryModel, error) {
	var ID int64

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE categories
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
		RETURNING id
	`

	err := cr.Pgx.QueryRow(
		ctx,
		sql,
		payload.Name,
		payload.Type,
		payload.Note,
		payload.Icon,
		payload.IconColor,
		payload.ArchivedAt,
		id).Scan(&ID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.CategoryModel{}, huma.Error404NotFound("Category not found")
		}
		return models.CategoryModel{}, huma.Error500InternalServerError("Unable to update category", err)
	}

	return cr.GetDetail(ctx, ID)
}

func (cr CategoryRepository) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE categories
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1
			AND deleted_at IS NULL
	`

	cmdTag, err := cr.Pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error500InternalServerError("Unable to delete category", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Category not found")
	}

	return nil
}

func (cr CategoryRepository) Reorder(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE categories
            SET display_order = v.new_order,
                updated_at = CURRENT_TIMESTAMP
            FROM (
                SELECT id::bigint AS id, ord - 1 AS new_order
                FROM unnest($1::int8[]) WITH ORDINALITY AS t(id, ord)
            ) v
            WHERE categories.id = v.id
                AND deleted_at IS NULL`

	_, err := cr.Pgx.Exec(ctx, sql, ids)
	if err != nil {
		return huma.Error500InternalServerError("Unable to reorder categories", err)
	}

	return nil
}

// ValidateIDsExist checks provided ids exist and that provided list equals total active categories
func (cr CategoryRepository) ValidateIDsExist(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return huma.Error400BadRequest("No category IDs provided")
	}

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var matched int
	sql := `SELECT COUNT(1) FROM categories WHERE id = ANY($1::int8[]) AND deleted_at IS NULL`
	if err := cr.Pgx.QueryRow(ctx, sql, ids).Scan(&matched); err != nil {
		return huma.Error500InternalServerError("Unable to validate categories", err)
	}
	if matched != len(ids) {
		return huma.Error404NotFound("One or more categories not found")
	}

	var totalActive int
	if err := cr.Pgx.QueryRow(ctx, `SELECT COUNT(1) FROM categories WHERE deleted_at IS NULL`).Scan(&totalActive); err != nil {
		return huma.Error500InternalServerError("Unable to validate category count", err)
	}
	if totalActive != len(ids) {
		return huma.Error400BadRequest("Provided category IDs must include all active categories")
	}

	return nil
}

// DeleteWithTx performs a soft delete using provided transaction
func (cr CategoryRepository) DeleteWithTx(ctx context.Context, tx pgx.Tx, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	delSQL := `UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	cmdTag, err := tx.Exec(ctx, delSQL, id)
	if err != nil {
		return huma.Error500InternalServerError("Unable to delete category", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Category not found")
	}
	return nil
}

// GetActiveIDsOrderedWithTx returns non-deleted category ids ordered by display_order using provided tx
func (cr CategoryRepository) GetActiveIDsOrderedWithTx(ctx context.Context, tx pgx.Tx) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	rows, err := tx.Query(ctx, `SELECT id FROM categories WHERE deleted_at IS NULL ORDER BY display_order ASC, id ASC`)
	if err != nil {
		return nil, huma.Error500InternalServerError("Unable to query category ids", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan category id", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, huma.Error500InternalServerError("Error reading category ids", err)
	}
	return ids, nil
}

// ReorderWithTx reorders categories using provided tx and ids
func (cr CategoryRepository) ReorderWithTx(ctx context.Context, tx pgx.Tx, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	reorderSQL := `UPDATE categories SET display_order = v.new_order, updated_at = CURRENT_TIMESTAMP FROM (SELECT id::bigint AS id, ord - 1 AS new_order FROM unnest($1::int8[]) WITH ORDINALITY AS t(id, ord)) v WHERE categories.id = v.id AND deleted_at IS NULL`
	if _, err := tx.Exec(ctx, reorderSQL, ids); err != nil {
		return huma.Error500InternalServerError("Unable to reorder categories", err)
	}
	return nil
}
