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

func (br BudgetRepository) GetPaged(ctx context.Context, query models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
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

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]
	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered AS (
			SELECT
				b.id,
				b.template_id,
				b.account_id,
				b.category_id,
				b.period_start,
				b.period_end,
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
				b.note,
				b.created_at,
				b.updated_at,
				b.deleted_at
			FROM budgets b
			WHERE b.deleted_at IS NULL
		),
		counted AS (
			SELECT COUNT(*) as total FROM filtered
		)
		SELECT
			f.id,
			f.template_id,
			f.account_id,
			f.category_id,
			f.period_start,
			f.period_end,
			f.amount_limit,
			f.actual_amount,
			f.note,
			f.created_at,
			f.updated_at,
			f.deleted_at,
			c.total
		FROM filtered f
		CROSS JOIN counted c
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
	`

	rows, err := br.pgx.Query(ctx, sql, query.PageSize, offset)
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
			&item.ActualAmount,
			&item.Note,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DeletedAt,
			&totalCount)
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
		&data.AmountLimit, &data.ActualAmount, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
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
	query := `
		INSERT INTO budgets (
			template_id,
			account_id,
			category_id,
			period_start,
			period_end,
			amount_limit,
			note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
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
		p.Note,
	).Scan(&ID)

	if err != nil {
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to create budget", err)
	}

	return br.GetDetail(ctx, ID)
}

func (br BudgetRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
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
		RETURNING id`

	var ID int64
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
	).Scan(&ID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetModel{}, huma.Error404NotFound("Budget not found")
		}
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to update budget", err)
	}

	return br.GetDetail(ctx, ID)
}

func (br BudgetRepository) Delete(ctx context.Context, id int64) error {
	sql := `
		UPDATE budgets
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
