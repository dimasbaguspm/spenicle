package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
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

// calculatePeriodType determines the period type based on start and end dates
func calculatePeriodType(start, end time.Time) string {
	duration := end.Sub(start)
	days := int(duration.Hours()/24) + 1 // +1 to include both start and end dates

	// Debug logging
	fmt.Printf("DEBUG: start=%v, end=%v, duration=%v, hours=%v, days=%d\n", start, end, duration, duration.Hours(), days)

	// Check for weekly (7 days)
	if days == 7 {
		return "weekly"
	}

	// Check for monthly (28-31 days)
	if days >= 28 && days <= 31 {
		return "monthly"
	}

	// Check for yearly (365-366 days)
	if days >= 365 && days <= 366 {
		return "yearly"
	}

	return "custom"
}

func (br BudgetRepository) GetPaged(ctx context.Context, query models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sortByMap := map[string]string{
		"id":          "id",
		"templateId":  "template_id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"periodStart": "period_start",
		"periodEnd":   "period_end",
		"amountLimit": "amount_limit",
		"status":      "status",
		"name":        "name",
		"createdAt":   "created_at",
		"updatedAt":   "updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]
	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered_budgets AS (
			SELECT
				b.id,
				b.template_id,
				b.account_id,
				b.category_id,
				b.period_start,
				b.period_end,
				b.amount_limit,
				b.status,
				b.period_type,
				b.name,
				COALESCE((
					SELECT SUM(t.amount)
					FROM transactions t
					WHERE t.deleted_at IS NULL
						AND t.date >= b.period_start
						AND t.date <= b.period_end
						AND (b.account_id IS NULL OR t.account_id = b.account_id)
						AND (b.category_id IS NULL OR t.category_id = b.category_id)
				), 0) as actual_amount,
				b.note,
				b.created_at,
				b.updated_at,
				b.deleted_at,
				COUNT(*) OVER() as total_count
			FROM budgets b
			WHERE b.deleted_at IS NULL
					AND (array_length($3::int8[], 1) IS NULL OR b.id = ANY($3::int8[]))
					AND (array_length($4::int8[], 1) IS NULL OR b.template_id = ANY($4::int8[]))
					AND (array_length($5::int8[], 1) IS NULL OR b.account_id = ANY($5::int8[]))
					AND (array_length($6::int8[], 1) IS NULL OR b.category_id = ANY($6::int8[]))
					AND ($7::text IS NULL OR $7::text = '' OR b.status = $7::text)
					AND ($8::text IS NULL OR $8::text = '' OR b.name ILIKE '%' || $8::text || '%')
			ORDER BY b.` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
		)
		SELECT
			id,
			template_id,
			account_id,
			category_id,
			period_start,
			period_end,
			amount_limit,
			status,
			period_type,
			name,
			actual_amount,
			note,
			created_at,
			updated_at,
			deleted_at,
			total_count
		FROM filtered_budgets
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
		`

	var (
		ids         []int64
		templateIDs []int64
		accountIDs  []int64
		categoryIDs []int64
	)

	if len(query.IDs) > 0 {
		ids = query.IDs
	}
	if len(query.TemplateIDs) > 0 {
		templateIDs = query.TemplateIDs
	}
	if len(query.AccountIDs) > 0 {
		accountIDs = query.AccountIDs
	}
	if len(query.CategoryIDs) > 0 {
		categoryIDs = query.CategoryIDs
	}

	rows, err := br.pgx.Query(ctx, sql, query.PageSize, offset, ids, templateIDs, accountIDs, categoryIDs, query.Status, query.Name)
	if err != nil {
		return models.BudgetsPagedModel{}, huma.Error400BadRequest("Unable to query budgets", err)
	}
	defer rows.Close()

	var items []models.BudgetModel
	var totalCount int

	for rows.Next() {
		var item models.BudgetModel
		err := rows.Scan(
			&item.ID,
			&item.TemplateID,
			&item.AccountID,
			&item.CategoryID,
			&item.PeriodStart,
			&item.PeriodEnd,
			&item.AmountLimit,
			&item.Status,
			&item.PeriodType,
			&item.Name,
			&item.ActualAmount,
			&item.Note,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DeletedAt,
			&totalCount,
		)
		if err != nil {
			return models.BudgetsPagedModel{}, huma.Error400BadRequest("Unable to scan budget data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.BudgetsPagedModel{}, huma.Error400BadRequest("Error reading budget rows", err)
	}

	if items == nil {
		items = []models.BudgetModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.BudgetsPagedModel{
		Items:      items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
		TotalCount: totalCount,
	}, nil
}

func (br BudgetRepository) GetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var data models.BudgetModel

	query := `
		SELECT
			b.id,
			b.template_id,
			b.account_id,
			b.category_id,
			b.period_start,
			b.period_end,
			b.amount_limit,
			b.status,
			b.period_type,
			b.name,
			COALESCE((
				SELECT SUM(t.amount)
				FROM transactions t
				WHERE t.deleted_at IS NULL
					AND t.date >= b.period_start
					AND t.date <= b.period_end
					AND (b.account_id IS NULL OR t.account_id = b.account_id)
					AND (b.category_id IS NULL OR t.category_id = b.category_id)
			), 0) as actual_amount,
			b.note,
			b.created_at,
			b.updated_at,
			b.deleted_at
		FROM budgets b
		WHERE b.id = $1
			AND b.deleted_at IS NULL`

	err := br.pgx.QueryRow(ctx, query, id).Scan(
		&data.ID, &data.TemplateID, &data.AccountID, &data.CategoryID, &data.PeriodStart, &data.PeriodEnd,
		&data.AmountLimit, &data.Status, &data.PeriodType, &data.Name, &data.ActualAmount, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetModel{}, huma.Error404NotFound("Budget not found")
	}
	if err != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to query budget", err)
	}

	return data, nil
}

func (br BudgetRepository) Create(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// Calculate period type based on dates
	periodType := calculatePeriodType(p.PeriodStart, p.PeriodEnd)

	// Validate that only one active budget exists per account/category combination
	if err := br.validateUniqueActiveBudget(ctx, p.AccountID, p.CategoryID, periodType); err != nil {
		return models.BudgetModel{}, err
	}

	query := `
		INSERT INTO budgets (
			template_id,
			account_id,
			category_id,
			period_start,
			period_end,
			amount_limit,
			status,
			period_type,
			name,
			note)
		VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)
		RETURNING id`

	var ID int64
	err := br.pgx.QueryRow(
		ctx,
		query,
		p.TemplateID,
		p.AccountID,
		p.CategoryID,
		p.PeriodStart,
		p.PeriodEnd,
		p.AmountLimit,
		periodType,
		p.Name,
		p.Note,
	).Scan(&ID)

	if err != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to create budget", err)
	}

	return br.GetDetail(ctx, ID)
}

func (br BudgetRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	current, err := br.GetDetail(ctx, id)
	if err != nil {
		return models.BudgetModel{}, err
	}

	periodType := current.PeriodType
	periodStart := current.PeriodStart
	periodEnd := current.PeriodEnd

	if p.PeriodStart != nil {
		periodStart = *p.PeriodStart
	}
	if p.PeriodEnd != nil {
		periodEnd = *p.PeriodEnd
	}

	if p.PeriodStart != nil || p.PeriodEnd != nil {
		periodType = calculatePeriodType(periodStart, periodEnd)
	}

	if p.Status != nil && *p.Status == "active" {
		if err := br.validateUniqueActiveBudget(ctx, current.AccountID, current.CategoryID, periodType); err != nil {
			return models.BudgetModel{}, err
		}
	}

	query := `
		UPDATE budgets
		SET period_start = COALESCE($1, period_start),
		    period_end = COALESCE($2, period_end),
		    amount_limit = COALESCE($3, amount_limit),
		    status = COALESCE($4, status),
		    period_type = $5,
		    name = COALESCE($6, name),
		    note = COALESCE($7, note),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $8 AND deleted_at IS NULL
		RETURNING id`

	var ID int64
	err = br.pgx.QueryRow(
		ctx,
		query,
		p.PeriodStart,
		p.PeriodEnd,
		p.AmountLimit,
		p.Status,
		periodType,
		p.Name,
		p.Note,
		id,
	).Scan(&ID)

	if err != nil {
		return models.BudgetModel{}, huma.Error500InternalServerError("Unable to update budget", err)
	}

	return br.GetDetail(ctx, ID)
}

func (br BudgetRepository) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE budgets
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := br.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error500InternalServerError("Unable to delete budget", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Budget not found")
	}

	return nil
}

// validateUniqueActiveBudget ensures only one active budget exists per account/category/period_type combination
func (br BudgetRepository) validateUniqueActiveBudget(ctx context.Context, accountID, categoryID *int64, periodType string) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	query := `
		SELECT COUNT(1)
		FROM budgets
		WHERE deleted_at IS NULL
			AND status = 'active'
			AND account_id IS NOT DISTINCT FROM $1
			AND category_id IS NOT DISTINCT FROM $2
			AND period_type = $3`

	var count int
	err := br.pgx.QueryRow(ctx, query, accountID, categoryID, periodType).Scan(&count)
	if err != nil {
		return huma.Error500InternalServerError("Unable to validate budget uniqueness", err)
	}

	if count > 0 {
		return huma.Error400BadRequest("An active budget already exists for this account/category/period combination")
	}

	return nil
}

func (br BudgetRepository) DeactivateExistingActiveBudgets(ctx context.Context, accountID, categoryID *int64, periodType string) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	query := `
		UPDATE budgets
		SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
		WHERE deleted_at IS NULL
			AND status = 'active'
			AND account_id IS NOT DISTINCT FROM $1
			AND category_id IS NOT DISTINCT FROM $2
			AND period_type = $3`

	_, err := br.pgx.Exec(ctx, query, accountID, categoryID, periodType)
	if err != nil {
		return huma.Error500InternalServerError("Unable to deactivate existing active budgets", err)
	}

	return nil
}
