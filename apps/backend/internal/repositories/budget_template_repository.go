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

func (btr BudgetTemplateRepository) GetPaged(ctx context.Context, query models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
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

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]
	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered AS (
			SELECT
				id,
				account_id,
				category_id,
				amount_limit,
				recurrence,
				start_date,
				end_date,
				last_executed_at,
				note,
				created_at,
				updated_at,
				deleted_at
			FROM budget_templates
			WHERE deleted_at IS NULL
		),
		counted AS (
			SELECT COUNT(*) AS total_count FROM filtered
		)
		SELECT
			f.id,
			f.account_id,
			f.category_id,
			f.amount_limit,
			f.recurrence,
			f.start_date,
			f.end_date,
			f.last_executed_at,
			f.note,
			f.created_at,
			f.updated_at,
			f.deleted_at,
			c.total_count
		FROM filtered f
		CROSS JOIN counted c
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
	`

	rows, err := btr.pgx.Query(ctx, sql, query.PageSize, offset)
	if err != nil {
		return models.BudgetTemplatesPagedModel{}, huma.Error400BadRequest("Unable to query budget templates", err)
	}
	defer rows.Close()

	var items []models.BudgetTemplateModel
	var totalCount int

	for rows.Next() {
		var item models.BudgetTemplateModel
		err := rows.Scan(&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence, &item.StartDate, &item.EndDate, &item.LastExecutedAt, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt, &totalCount)
		if err != nil {
			return models.BudgetTemplatesPagedModel{}, huma.Error400BadRequest("Unable to scan budget template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.BudgetTemplatesPagedModel{}, huma.Error400BadRequest("Error reading budget template rows", err)
	}

	if items == nil {
		items = []models.BudgetTemplateModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.BudgetTemplatesPagedModel{
		Items:      items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
		TotalCount: totalCount,
	}, nil
}

func (btr BudgetTemplateRepository) GetDetail(ctx context.Context, id int64) (models.BudgetTemplateModel, error) {
	var data models.BudgetTemplateModel
	query := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date, last_executed_at, note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE id = $1
			AND deleted_at IS NULL`

	err := btr.pgx.QueryRow(ctx, query, id).Scan(
		&data.ID, &data.AccountID, &data.CategoryID, &data.AmountLimit, &data.Recurrence,
		&data.StartDate, &data.EndDate, &data.LastExecutedAt, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetTemplateModel{}, huma.Error404NotFound("Budget template not found")
	}
	if err != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Unable to query budget template", err)
	}

	return data, nil
}

func (btr BudgetTemplateRepository) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	var ID int64

	query := `
		INSERT INTO budget_templates (account_id, category_id, amount_limit, recurrence, start_date, end_date, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

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
	).Scan(&ID)

	if err != nil {
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Unable to create budget template", err)
	}

	return btr.GetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	var ID int64
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
		RETURNING id`

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
	).Scan(&ID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetTemplateModel{}, huma.Error404NotFound("Budget template not found")
		}
		return models.BudgetTemplateModel{}, huma.Error400BadRequest("Unable to update budget template", err)
	}

	return btr.GetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) Delete(ctx context.Context, id int64) error {
	sql := `
		UPDATE budget_templates
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1
			AND deleted_at IS NULL`

	cmdTag, err := btr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete budget template", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Budget template not found")
	}

	return nil
}

func (btr BudgetTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.BudgetTemplateModel, error) {
	sql := `
		WITH active_templates AS (
			SELECT
				id,
				account_id,
				category_id,
				amount_limit,
				recurrence,
				start_date,
				end_date,
				last_executed_at,
				note,
				created_at,
				updated_at,
				deleted_at
			FROM budget_templates
			WHERE deleted_at IS NULL
				AND recurrence != 'none'
				AND start_date <= CURRENT_DATE
				AND (end_date IS NULL OR end_date >= CURRENT_DATE)
		),
		due_templates AS (
			SELECT *
			FROM active_templates
			WHERE last_executed_at IS NULL
				OR (recurrence = 'weekly' AND last_executed_at < NOW() - INTERVAL '7 days')
				OR (recurrence = 'monthly' AND last_executed_at < NOW() - INTERVAL '1 month')
				OR (recurrence = 'yearly' AND last_executed_at < NOW() - INTERVAL '1 year')
		)
		SELECT
			id,
			account_id,
			category_id,
			amount_limit,
			recurrence,
			start_date,
			end_date,
			last_executed_at,
			note,
			created_at,
			updated_at,
			deleted_at
		FROM due_templates
	`

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
			&item.StartDate, &item.EndDate, &item.LastExecutedAt, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
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
