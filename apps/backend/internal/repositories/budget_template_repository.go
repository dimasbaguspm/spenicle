package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type BudgetTemplateRepository struct {
	db DB
}

func NewBudgetTemplateRepository(db DB) *BudgetTemplateRepository {
	return &BudgetTemplateRepository{db: db}
}

// List retrieves paginated budget templates with filters
func (r *BudgetTemplateRepository) List(ctx context.Context, params schemas.SearchParamBudgetTemplateSchema) (*schemas.PaginatedBudgetTemplateSchema, error) {
	qb := utils.QueryBuilder()

	// Add filters
	if len(params.ID) > 0 {
		qb.AddInFilter("id", params.ID)
	}
	if len(params.AccountID) > 0 {
		qb.AddInFilter("account_id", params.AccountID)
	}
	if len(params.CategoryID) > 0 {
		qb.AddInFilter("category_id", params.CategoryID)
	}
	if len(params.Recurrence) > 0 {
		qb.AddInFilterString("recurrence", params.Recurrence)
	}
	qb.Add("deleted_at IS NULL")

	whereClause, args := qb.ToWhereClause()

	// Build count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM budget_templates %s", whereClause)

	var totalCount int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count budget templates: %w", err)
	}

	// Handle empty result
	if totalCount == 0 {
		return &schemas.PaginatedBudgetTemplateSchema{
			Items:      []schemas.BudgetTemplateSchema{},
			TotalCount: 0,
			Page:       params.Page,
			Limit:      params.Limit,
		}, nil
	}

	// Build ORDER BY clause
	orderByClause := qb.BuildOrderBy(params.OrderBy, params.Sort, map[string]string{
		"id":          "id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"amountLimit": "amount_limit",
		"recurrence":  "recurrence",
		"startDate":   "start_date",
		"endDate":     "end_date",
		"createdAt":   "created_at",
		"updatedAt":   "updated_at",
	})

	// Build data query with pagination
	offset := (params.Page - 1) * params.Limit
	dataQuery := fmt.Sprintf(`
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date,
		       note, created_at, updated_at, deleted_at
		FROM budget_templates
		%s
		%s
		LIMIT $%d OFFSET $%d`,
		whereClause,
		orderByClause,
		qb.NextArgIndex(),
		qb.NextArgIndex()+1,
	)
	args = append(args, params.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query budget templates: %w", err)
	}
	defer rows.Close()

	items, err := schemas.PaginatedBudgetTemplateSchema{}.FromRows(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan budget templates: %w", err)
	}

	return &schemas.PaginatedBudgetTemplateSchema{
		Items:      items,
		TotalCount: totalCount,
		Page:       params.Page,
		Limit:      params.Limit,
	}, nil
}

// Get retrieves a single budget template by ID (not deleted)
func (r *BudgetTemplateRepository) Get(ctx context.Context, id int) (*schemas.BudgetTemplateSchema, error) {
	query := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date,
		       note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE id = $1 AND deleted_at IS NULL`

	var template schemas.BudgetTemplateSchema
	err := r.db.QueryRow(ctx, query, id).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.AmountLimit,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get budget template: %w", err)
	}

	return &template, nil
}

// Create creates a new budget template
func (r *BudgetTemplateRepository) Create(ctx context.Context, input schemas.CreateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error) {
	query := `
		INSERT INTO budget_templates (account_id, category_id, amount_limit, recurrence, start_date, end_date, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, account_id, category_id, amount_limit, recurrence, start_date, end_date,
		          note, created_at, updated_at, deleted_at`

	var template schemas.BudgetTemplateSchema
	err := r.db.QueryRow(
		ctx,
		query,
		input.AccountID,
		input.CategoryID,
		input.AmountLimit,
		input.Recurrence,
		input.StartDate,
		input.EndDate,
		input.Note,
	).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.AmountLimit,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create budget template: %w", err)
	}

	return &template, nil
}

// Update updates an existing budget template
func (r *BudgetTemplateRepository) Update(ctx context.Context, id int, input schemas.UpdateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error) {
	qb := utils.QueryBuilder()
	updates := []string{}

	if input.AccountID != nil {
		updates = append(updates, fmt.Sprintf("account_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.AccountID)
	}
	if input.CategoryID != nil {
		updates = append(updates, fmt.Sprintf("category_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.CategoryID)
	}
	if input.AmountLimit != nil {
		updates = append(updates, fmt.Sprintf("amount_limit = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.AmountLimit)
	}
	if input.Recurrence != nil {
		updates = append(updates, fmt.Sprintf("recurrence = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Recurrence)
	}
	if input.StartDate != nil {
		updates = append(updates, fmt.Sprintf("start_date = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.StartDate)
	}
	if input.EndDate != nil {
		updates = append(updates, fmt.Sprintf("end_date = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.EndDate)
	}
	if input.Note != nil {
		updates = append(updates, fmt.Sprintf("note = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Note)
	}

	if len(updates) == 0 {
		return r.Get(ctx, id)
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", qb.NextArgIndex()))
	qb.AddArg(time.Now())

	query := fmt.Sprintf(`
		UPDATE budget_templates
		SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, account_id, category_id, amount_limit, recurrence, start_date, end_date,
		          note, created_at, updated_at, deleted_at`,
		utils.JoinStrings(updates, ", "),
		qb.NextArgIndex(),
	)
	qb.AddArg(id)

	var template schemas.BudgetTemplateSchema
	err := r.db.QueryRow(ctx, query, qb.GetArgs()...).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.AmountLimit,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update budget template: %w", err)
	}

	return &template, nil
}

// Delete soft-deletes a budget template
func (r *BudgetTemplateRepository) Delete(ctx context.Context, id int) error {
	query := `
		UPDATE budget_templates
		SET deleted_at = $1, updated_at = $1
		WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.db.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to delete budget template: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return nil // Already deleted or not found
	}

	return nil
}

// GetActiveTemplates retrieves templates that should generate budgets
// Used by worker to create recurring budgets
func (r *BudgetTemplateRepository) GetActiveTemplates(ctx context.Context) ([]schemas.BudgetTemplateSchema, error) {
	query := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date,
		       note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE deleted_at IS NULL
		  AND recurrence != 'none'
		  AND start_date <= $1
		  AND (end_date IS NULL OR end_date >= $1)
		ORDER BY id`

	rows, err := r.db.Query(ctx, query, time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to query active templates: %w", err)
	}
	defer rows.Close()

	items, err := schemas.PaginatedBudgetTemplateSchema{}.FromRows(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan active templates: %w", err)
	}

	return items, nil
}
