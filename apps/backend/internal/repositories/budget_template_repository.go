package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BudgetTemplateRepository struct {
	pgx *pgxpool.Pool
}

func NewBudgetTemplateRepository(pgx *pgxpool.Pool) BudgetTemplateRepository {
	return BudgetTemplateRepository{pgx}
}

// List retrieves paginated budget templates with filters
func (btr BudgetTemplateRepository) List(ctx context.Context, p models.ListBudgetTemplatesRequestModel) (models.ListBudgetTemplatesResponseModel, error) {
	// Enforce page size limits
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 10
	}
	if p.PageNumber <= 0 {
		p.PageNumber = 1
	}

	sortByMap := map[string]string{
		"id":          "id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"amountLimit": "amount_limit",
		"recurrence":  "recurrence",
		"startDate":   "start_date",
		"endDate":     "end_date",
		"createdAt":   "created_at",
		"updatedAt":   "updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn, ok := sortByMap[p.SortBy]
	if !ok {
		sortColumn = "created_at"
	}
	sortOrder, ok := sortOrderMap[p.SortOrder]
	if !ok {
		sortOrder = "DESC"
	}

	offset := (p.PageNumber - 1) * p.PageSize

	// Count total matching budget templates
	countSQL := `SELECT COUNT(*) FROM budget_templates WHERE deleted_at IS NULL`
	var totalCount int
	if err := btr.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListBudgetTemplatesResponseModel{}, huma.Error400BadRequest("Unable to count budget templates", err)
	}

	// Fetch paginated budget templates
	sql := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date, note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE deleted_at IS NULL
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
		LIMIT $1 OFFSET $2`

	rows, err := btr.pgx.Query(ctx, sql, p.PageSize, offset)
	if err != nil {
		return models.ListBudgetTemplatesResponseModel{}, huma.Error400BadRequest("Unable to query budget templates", err)
	}
	defer rows.Close()

	var items []models.BudgetTemplateModel
	for rows.Next() {
		var item models.BudgetTemplateModel
		if err := rows.Scan(
			&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
			&item.StartDate, &item.EndDate, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return models.ListBudgetTemplatesResponseModel{}, huma.Error400BadRequest("Unable to scan budget template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListBudgetTemplatesResponseModel{}, huma.Error400BadRequest("Error reading budget template rows", err)
	}

	if items == nil {
		items = []models.BudgetTemplateModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.ListBudgetTemplatesResponseModel{
		Data:       items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get retrieves a single budget template by ID
func (btr BudgetTemplateRepository) Get(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	query := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date, note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE id = $1 AND deleted_at IS NULL`

	var item models.BudgetTemplateModel
	err := btr.pgx.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
		&item.StartDate, &item.EndDate, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetTemplateModel{}, huma.Error404NotFound("Budget template not found")
	}
	if err != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Unable to query budget template", err)
	}

	return item, nil
}

// Create creates a new budget template
func (btr BudgetTemplateRepository) Create(ctx context.Context, p models.CreateBudgetTemplateRequestModel) (models.CreateBudgetTemplateResponseModel, error) {
	query := `
		INSERT INTO budget_templates (account_id, category_id, amount_limit, recurrence, start_date, end_date, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, account_id, category_id, amount_limit, recurrence, start_date, end_date, note, created_at, updated_at, deleted_at`

	var item models.BudgetTemplateModel
	err := btr.pgx.QueryRow(
		ctx,
		query,
		p.AccountID,
		p.CategoryID,
		p.AmountLimit,
		p.Recurrence,
		p.StartDate,
		p.EndDate,
		p.Note,
	).Scan(
		&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
		&item.StartDate, &item.EndDate, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		return models.CreateBudgetTemplateResponseModel{}, huma.Error400BadRequest("Unable to create budget template", err)
	}

	return models.CreateBudgetTemplateResponseModel{BudgetTemplateModel: item}, nil
}

// Update updates an existing budget template
func (btr BudgetTemplateRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateRequestModel) (models.UpdateBudgetTemplateResponseModel, error) {
	query := `
		UPDATE budget_templates
		SET account_id = COALESCE($1, account_id),
		    category_id = COALESCE($2, category_id),
		    amount_limit = COALESCE($3, amount_limit),
		    recurrence = COALESCE($4, recurrence),
		    start_date = COALESCE($5, start_date),
		    end_date = COALESCE($6, end_date),
		    note = COALESCE($7, note),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $8 AND deleted_at IS NULL
		RETURNING id, account_id, category_id, amount_limit, recurrence, start_date, end_date, note, created_at, updated_at, deleted_at`

	var item models.BudgetTemplateModel
	err := btr.pgx.QueryRow(
		ctx,
		query,
		p.AccountID,
		p.CategoryID,
		p.AmountLimit,
		p.Recurrence,
		p.StartDate,
		p.EndDate,
		p.Note,
		id,
	).Scan(
		&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
		&item.StartDate, &item.EndDate, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateBudgetTemplateResponseModel{}, huma.Error404NotFound("Budget template not found")
		}
		return models.UpdateBudgetTemplateResponseModel{}, huma.Error400BadRequest("Unable to update budget template", err)
	}

	return models.UpdateBudgetTemplateResponseModel{BudgetTemplateModel: item}, nil
}

// Delete soft-deletes a budget template
func (btr BudgetTemplateRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE budget_templates
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := btr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete budget template", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Budget template not found")
	}

	return nil
}

// GetDueTemplates retrieves budget templates that are due for processing based on their recurrence patterns
func (btr BudgetTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.BudgetTemplateModel, error) {
	// Query budget templates that:
	// 1. Are not deleted
	// 2. Have recurrence set to something other than 'none'
	// 3. Start date is today or in the past
	// 4. End date is NULL or today or in the future
	// 5. Either have never been executed (last_executed_at IS NULL) or are due based on recurrence
	sql := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date, note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE deleted_at IS NULL
		  AND recurrence != 'none'
		  AND start_date <= CURRENT_DATE
		  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
		  AND (
		    last_executed_at IS NULL
		    OR (
		      recurrence = 'weekly' AND last_executed_at < NOW() - INTERVAL '7 days'
		    )
		    OR (
		      recurrence = 'monthly' AND last_executed_at < NOW() - INTERVAL '1 month'
		    )
		    OR (
		      recurrence = 'yearly' AND last_executed_at < NOW() - INTERVAL '1 year'
		    )
		  )
		ORDER BY created_at ASC`

	rows, err := btr.pgx.Query(ctx, sql)
	if err != nil {
		return nil, huma.Error400BadRequest("Unable to query due budget templates", err)
	}
	defer rows.Close()

	var items []models.BudgetTemplateModel
	for rows.Next() {
		var item models.BudgetTemplateModel
		if err := rows.Scan(
			&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
			&item.StartDate, &item.EndDate, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return nil, huma.Error400BadRequest("Unable to scan due budget template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error400BadRequest("Error reading due budget template rows", err)
	}

	if items == nil {
		items = []models.BudgetTemplateModel{}
	}

	return items, nil
}

// UpdateLastExecuted updates the last_executed_at timestamp for a budget template
func (btr BudgetTemplateRepository) UpdateLastExecuted(ctx context.Context, id int64) error {
	sql := `
		UPDATE budget_templates
		SET last_executed_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	_, err := btr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to update budget template execution time", err)
	}
	return nil
}
