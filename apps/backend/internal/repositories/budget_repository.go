package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type BudgetRepository struct {
	db DB
}

func NewBudgetRepository(db DB) *BudgetRepository {
	return &BudgetRepository{db: db}
}

// List retrieves paginated budgets with filters
func (r *BudgetRepository) List(ctx context.Context, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
	qb := utils.QueryBuilder()

	// Add filters
	if len(params.ID) > 0 {
		qb.AddInFilter("id", params.ID)
	}
	if len(params.TemplateIDs) > 0 {
		qb.AddInFilter("template_id", params.TemplateIDs)
	}
	if len(params.AccountIDs) > 0 {
		qb.AddInFilter("account_id", params.AccountIDs)
	}
	if len(params.CategoryIDs) > 0 {
		qb.AddInFilter("category_id", params.CategoryIDs)
	}
	qb.Add("deleted_at IS NULL")

	whereClause, args := qb.ToWhereClause()

	// Build count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM budgets %s", whereClause)

	var totalCount int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count budgets: %w", err)
	}

	// Handle empty result
	if totalCount == 0 {
		return &schemas.PaginatedBudgetSchema{
			Items:      []schemas.BudgetSchema{},
			TotalCount: 0,
			PageNumber: params.PageNumber,
			PageSize:   params.PageSize,
			PageTotal:  0,
		}, nil
	}

	// Build ORDER BY clause
	orderByClause := qb.BuildOrderBy(params.SortBy, params.SortOrder, map[string]string{
		"id":          "id",
		"templateId":  "template_id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"periodStart": "period_start",
		"periodEnd":   "period_end",
		"amountLimit": "amount_limit",
		"createdAt":   "created_at",
		"updatedAt":   "updated_at",
	})

	// Build data query with pagination and calculated actual_amount
	offset := (params.PageNumber - 1) * params.PageSize
	dataQuery := fmt.Sprintf(`
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
		%s
		%s
		LIMIT $%d OFFSET $%d`,
		whereClause,
		orderByClause,
		qb.NextArgIndex(),
		qb.NextArgIndex()+1,
	)
	args = append(args, params.PageSize, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query budgets: %w", err)
	}
	defer rows.Close()

	items, err := schemas.PaginatedBudgetSchema{}.FromRows(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan budgets: %w", err)
	}

	return &schemas.PaginatedBudgetSchema{
		Items:      items,
		TotalCount: totalCount,
		PageNumber: params.PageNumber,
		PageSize:   params.PageSize,
		PageTotal:  (totalCount + params.PageSize - 1) / params.PageSize,
	}, nil
}

// Get retrieves a single budget by ID (not deleted) with calculated actual_amount
func (r *BudgetRepository) Get(ctx context.Context, id int) (*schemas.BudgetSchema, error) {
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

	var budget schemas.BudgetSchema
	err := r.db.QueryRow(ctx, query, id).Scan(
		&budget.ID,
		&budget.TemplateID,
		&budget.AccountID,
		&budget.CategoryID,
		&budget.PeriodStart,
		&budget.PeriodEnd,
		&budget.AmountLimit,
		&budget.ActualAmount,
		&budget.Note,
		&budget.CreatedAt,
		&budget.UpdatedAt,
		&budget.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get budget: %w", err)
	}

	return &budget, nil
}

// Create creates a new budget
func (r *BudgetRepository) Create(ctx context.Context, input schemas.CreateBudgetSchema) (*schemas.BudgetSchema, error) {
	query := `
		INSERT INTO budgets (template_id, account_id, category_id, period_start, period_end, amount_limit, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, template_id, account_id, category_id, period_start, period_end,
		          amount_limit, note, created_at, updated_at, deleted_at`

	var budget schemas.BudgetSchema
	err := r.db.QueryRow(
		ctx,
		query,
		input.TemplateID,
		input.AccountID,
		input.CategoryID,
		input.PeriodStart,
		input.PeriodEnd,
		input.AmountLimit,
		input.Note,
	).Scan(
		&budget.ID,
		&budget.TemplateID,
		&budget.AccountID,
		&budget.CategoryID,
		&budget.PeriodStart,
		&budget.PeriodEnd,
		&budget.AmountLimit,
		&budget.Note,
		&budget.CreatedAt,
		&budget.UpdatedAt,
		&budget.DeletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create budget: %w", err)
	}

	// Fetch the created budget with calculated actual_amount
	return r.Get(ctx, int(budget.ID))
}

// Update updates an existing budget
func (r *BudgetRepository) Update(ctx context.Context, id int, input schemas.UpdateBudgetSchema) (*schemas.BudgetSchema, error) {
	qb := utils.QueryBuilder()
	updates := []string{}

	if input.TemplateID != nil {
		updates = append(updates, fmt.Sprintf("template_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.TemplateID)
	}
	if input.AccountID != nil {
		updates = append(updates, fmt.Sprintf("account_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.AccountID)
	}
	if input.CategoryID != nil {
		updates = append(updates, fmt.Sprintf("category_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.CategoryID)
	}
	if input.PeriodStart != nil {
		updates = append(updates, fmt.Sprintf("period_start = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.PeriodStart)
	}
	if input.PeriodEnd != nil {
		updates = append(updates, fmt.Sprintf("period_end = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.PeriodEnd)
	}
	if input.AmountLimit != nil {
		updates = append(updates, fmt.Sprintf("amount_limit = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.AmountLimit)
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
		UPDATE budgets
		SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id`,
		utils.JoinStrings(updates, ", "),
		qb.NextArgIndex(),
	)
	qb.AddArg(id)

	var budgetID int
	err := r.db.QueryRow(ctx, query, qb.GetArgs()...).Scan(&budgetID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update budget: %w", err)
	}

	// Fetch the updated budget with calculated actual_amount
	return r.Get(ctx, budgetID)
}

// Delete soft-deletes a budget
func (r *BudgetRepository) Delete(ctx context.Context, id int) error {
	query := `
		UPDATE budgets
		SET deleted_at = $1, updated_at = $1
		WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.db.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to delete budget: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return nil // Already deleted or not found
	}

	return nil
}

// GetByAccountID retrieves budgets for a specific account
func (r *BudgetRepository) GetByAccountID(ctx context.Context, accountID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
	params.AccountIDs = []int{accountID}
	return r.List(ctx, params)
}

// GetByCategoryID retrieves budgets for a specific category
func (r *BudgetRepository) GetByCategoryID(ctx context.Context, categoryID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error) {
	params.CategoryIDs = []int{categoryID}
	return r.List(ctx, params)
}

// CheckDuplicate checks if a budget already exists for the same period and targets
func (r *BudgetRepository) CheckDuplicate(ctx context.Context, templateID *int, accountID *int, categoryID *int, periodStart time.Time, periodEnd time.Time) (bool, error) {
	qb := utils.QueryBuilder()
	qb.Add("deleted_at IS NULL")
	qb.Add(fmt.Sprintf("period_start = $%d", qb.NextArgIndex()))
	qb.AddArg(periodStart)
	qb.Add(fmt.Sprintf("period_end = $%d", qb.NextArgIndex()))
	qb.AddArg(periodEnd)

	if templateID != nil {
		qb.Add(fmt.Sprintf("template_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*templateID)
	}
	if accountID != nil {
		qb.Add(fmt.Sprintf("account_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*accountID)
	}
	if categoryID != nil {
		qb.Add(fmt.Sprintf("category_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*categoryID)
	}

	whereClause, args := qb.ToWhereClause()
	query := fmt.Sprintf("SELECT COUNT(*) FROM budgets %s", whereClause)

	var count int
	err := r.db.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check duplicate budget: %w", err)
	}

	return count > 0, nil
}
