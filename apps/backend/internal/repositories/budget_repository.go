package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BudgetRepository struct {
	pgx *pgxpool.Pool
}

func NewBudgetRepository(pgx *pgxpool.Pool) BudgetRepository {
	return BudgetRepository{pgx}
}

// List retrieves paginated budgets with filters and calculated actual amounts
func (br BudgetRepository) List(ctx context.Context, p models.ListBudgetsRequestModel) (models.ListBudgetsResponseModel, error) {
	// Enforce page size limits
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 10
	}
	if p.PageNumber <= 0 {
		p.PageNumber = 1
	}

	sortByMap := map[string]string{
		"id":          "id",
		"templateId":  "template_id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"periodStart": "period_start",
		"periodEnd":   "period_end",
		"amountLimit": "amount_limit",
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

	// Count total matching budgets
	countSQL := `SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL`
	var totalCount int
	if err := br.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListBudgetsResponseModel{}, huma.Error400BadRequest("Unable to count budgets", err)
	}

	// Fetch paginated budgets with calculated actual_amount
	sql := `
		SELECT b.id, b.template_id, b.account_id, b.category_id, b.period_start, b.period_end,
		       b.amount_limit,
		       COALESCE((
		           SELECT SUM(t.amount)
		           FROM transactions t
		           WHERE t.deleted_at IS NULL
		             AND t.date >= b.period_start
		             AND t.date <= b.period_end
		             AND (b.account_id IS NULL OR t.account_id = b.account_id)
		             AND (b.category_id IS NULL OR t.category_id = b.category_id)
		       ), 0) as actual_amount,
		       b.note, b.created_at, b.updated_at, b.deleted_at
		FROM budgets b
		WHERE b.deleted_at IS NULL
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
		LIMIT $1 OFFSET $2`

	rows, err := br.pgx.Query(ctx, sql, p.PageSize, offset)
	if err != nil {
		return models.ListBudgetsResponseModel{}, huma.Error400BadRequest("Unable to query budgets", err)
	}
	defer rows.Close()

	var items []models.BudgetModel
	for rows.Next() {
		var item models.BudgetModel
		if err := rows.Scan(
			&item.ID, &item.TemplateID, &item.AccountID, &item.CategoryID, &item.PeriodStart, &item.PeriodEnd,
			&item.AmountLimit, &item.ActualAmount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return models.ListBudgetsResponseModel{}, huma.Error400BadRequest("Unable to scan budget data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListBudgetsResponseModel{}, huma.Error400BadRequest("Error reading budget rows", err)
	}

	if items == nil {
		items = []models.BudgetModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.ListBudgetsResponseModel{
		Data:       items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get retrieves a single budget by ID with calculated actual_amount
func (br BudgetRepository) Get(ctx context.Context, id int64) (models.BudgetModel, error) {
	query := `
		SELECT b.id, b.template_id, b.account_id, b.category_id, b.period_start, b.period_end,
		       b.amount_limit,
		       COALESCE((
		           SELECT SUM(t.amount)
		           FROM transactions t
		           WHERE t.deleted_at IS NULL
		             AND t.date >= b.period_start
		             AND t.date <= b.period_end
		             AND (b.account_id IS NULL OR t.account_id = b.account_id)
		             AND (b.category_id IS NULL OR t.category_id = b.category_id)
		       ), 0) as actual_amount,
		       b.note, b.created_at, b.updated_at, b.deleted_at
		FROM budgets b
		WHERE b.id = $1 AND b.deleted_at IS NULL`

	var item models.BudgetModel
	err := br.pgx.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.TemplateID, &item.AccountID, &item.CategoryID, &item.PeriodStart, &item.PeriodEnd,
		&item.AmountLimit, &item.ActualAmount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetModel{}, huma.Error404NotFound("Budget not found")
	}
	if err != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to query budget", err)
	}

	return item, nil
}

// Create creates a new budget
func (br BudgetRepository) Create(ctx context.Context, p models.CreateBudgetRequestModel) (models.CreateBudgetResponseModel, error) {
	query := `
		INSERT INTO budgets (template_id, account_id, category_id, period_start, period_end, amount_limit, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, template_id, account_id, category_id, period_start, period_end,
		          amount_limit, note, created_at, updated_at, deleted_at`

	var item models.BudgetModel
	err := br.pgx.QueryRow(
		ctx,
		query,
		p.TemplateID,
		p.AccountID,
		p.CategoryID,
		p.PeriodStart,
		p.PeriodEnd,
		p.AmountLimit,
		p.Note,
	).Scan(
		&item.ID, &item.TemplateID, &item.AccountID, &item.CategoryID, &item.PeriodStart, &item.PeriodEnd,
		&item.AmountLimit, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		return models.CreateBudgetResponseModel{}, huma.Error400BadRequest("Unable to create budget", err)
	}

	return models.CreateBudgetResponseModel{BudgetModel: item}, nil
}

// Update updates an existing budget
func (br BudgetRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetRequestModel) (models.UpdateBudgetResponseModel, error) {
	query := `
		UPDATE budgets
		SET account_id = COALESCE($1, account_id),
		    category_id = COALESCE($2, category_id),
		    period_start = COALESCE($3, period_start),
		    period_end = COALESCE($4, period_end),
		    amount_limit = COALESCE($5, amount_limit),
		    note = COALESCE($6, note),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND deleted_at IS NULL
		RETURNING id, template_id, account_id, category_id, period_start, period_end,
		          amount_limit, note, created_at, updated_at, deleted_at`

	var item models.BudgetModel
	err := br.pgx.QueryRow(
		ctx,
		query,
		p.AccountID,
		p.CategoryID,
		p.PeriodStart,
		p.PeriodEnd,
		p.AmountLimit,
		p.Note,
		id,
	).Scan(
		&item.ID, &item.TemplateID, &item.AccountID, &item.CategoryID, &item.PeriodStart, &item.PeriodEnd,
		&item.AmountLimit, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateBudgetResponseModel{}, huma.Error404NotFound("Budget not found")
		}
		return models.UpdateBudgetResponseModel{}, huma.Error400BadRequest("Unable to update budget", err)
	}

	return models.UpdateBudgetResponseModel{BudgetModel: item}, nil
}

// Delete soft-deletes a budget
func (br BudgetRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE budgets
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := br.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete budget", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Budget not found")
	}

	return nil
}
