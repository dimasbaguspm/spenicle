package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/jackc/pgx/v5"
)

type BudgetTemplateRepository struct {
	db DBQuerier
}

func NewBudgetTemplateRepository(db DBQuerier) BudgetTemplateRepository {
	return BudgetTemplateRepository{db}
}

func (btr BudgetTemplateRepository) GetPaged(ctx context.Context, query models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sortByMap := map[string]string{
		"id":          "id",
		"accountId":   "account_id",
		"categoryId":  "category_id",
		"amountLimit": "amount_limit",
		"recurrence":  "recurrence",
		"startDate":   "start_date",
		"endDate":     "end_date",
		"name":        "name",
		"nextRunAt":   "next_run_at",
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
		WITH filtered_templates AS (
			SELECT
				b.id,
				b.account_id,
				b.category_id,
				b.amount_limit,
				b.recurrence,
				b.start_date,
				b.end_date,
				b.name,
				b.active,
				b.next_run_at,
				b.last_executed_at,
				b.note,
				b.created_at,
				b.updated_at,
				b.deleted_at,
				COUNT(*) OVER() as total_count
			FROM budget_templates b
			WHERE b.deleted_at IS NULL
				AND (array_length($3::int8[], 1) IS NULL OR b.id = ANY($3::int8[]))
				AND (array_length($4::int8[], 1) IS NULL OR b.account_id = ANY($4::int8[]))
				AND (array_length($5::int8[], 1) IS NULL OR b.category_id = ANY($5::int8[]))
				AND ($6::text IS NULL OR $6::text = '' OR b.recurrence = $6::text)
				AND ($7::bool IS NULL OR b.active = $7::bool)
			ORDER BY b.` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
		)
		SELECT
			id,
			account_id,
			category_id,
			amount_limit,
			recurrence,
			start_date,
			end_date,
			name,
			active,
			next_run_at,
			last_executed_at,
			note,
			created_at,
			updated_at,
			deleted_at,
			total_count
		FROM filtered_templates
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
	`

	var (
		ids         []int64
		accountIDs  []int64
		categoryIDs []int64
	)

	if len(query.IDs) > 0 {
		ids = query.IDs
	}
	if len(query.AccountIDs) > 0 {
		accountIDs = query.AccountIDs
	}
	if len(query.CategoryIDs) > 0 {
		categoryIDs = query.CategoryIDs
	}

	queryStart := time.Now()
	rows, err := btr.db.Query(ctx, sql, query.PageSize, offset, ids, accountIDs, categoryIDs, query.Recurrence, query.Active)
	if err != nil {
		observability.RecordError("database")
		return models.BudgetTemplatesPagedModel{}, huma.Error400BadRequest("Unable to query budget templates", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budget_templates", time.Since(queryStart).Seconds())

	var items []models.BudgetTemplateModel
	var totalCount int

	for rows.Next() {
		var item models.BudgetTemplateModel
		err := rows.Scan(&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence, &item.StartDate, &item.EndDate, &item.Name, &item.Active, &item.NextRunAt, &item.LastExecutedAt, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt, &totalCount)
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
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var data models.BudgetTemplateModel
	query := `
		SELECT id, account_id, category_id, amount_limit, recurrence, start_date, end_date, name, active, next_run_at, last_executed_at, note, created_at, updated_at, deleted_at
		FROM budget_templates
		WHERE id = $1
			AND deleted_at IS NULL`

	queryStart := time.Now()
	err := btr.db.QueryRow(ctx, query, id).Scan(
		&data.ID, &data.AccountID, &data.CategoryID, &data.AmountLimit, &data.Recurrence,
		&data.StartDate, &data.EndDate, &data.Name, &data.Active, &data.NextRunAt, &data.LastExecutedAt, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetTemplateModel{}, huma.Error404NotFound("Budget template not found")
	}
	if err != nil {
		observability.RecordError("database")
		return models.BudgetTemplateModel{}, huma.Error500InternalServerError("Unable to query budget template", err)
	}
	observability.RecordQueryDuration("SELECT", "budget_templates", time.Since(queryStart).Seconds())

	return data, nil
}

func (btr BudgetTemplateRepository) Create(ctx context.Context, p models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var ID int64

	var nextRunAt *time.Time
	if p.Recurrence != "none" {
		nextRunAt = &p.StartDate
	}

	query := `
		INSERT INTO budget_templates (account_id, category_id, amount_limit, recurrence, start_date, end_date, name, active, next_run_at, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	queryStart := time.Now()
	err := btr.db.QueryRow(
		ctx,
		query,
		p.AccountID,
		p.CategoryID,
		p.AmountLimit,
		p.Recurrence,
		p.StartDate,
		p.EndDate,
		p.Name,
		p.Active,
		nextRunAt,
		p.Note,
	).Scan(&ID)

	if err != nil {
		observability.RecordError("database")
		return models.BudgetTemplateModel{}, huma.Error500InternalServerError("Unable to create budget template", err)
	}
	observability.RecordQueryDuration("INSERT", "budget_templates", time.Since(queryStart).Seconds())

	return btr.GetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) Update(ctx context.Context, id int64, p models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var ID int64
	query := `
		UPDATE budget_templates
		SET name = COALESCE($1, name),
		    note = COALESCE($2, note),
		    active = COALESCE($3, active),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND deleted_at IS NULL
		RETURNING id`

	queryStart := time.Now()
	err := btr.db.QueryRow(
		ctx,
		query,
		p.Name,
		p.Note,
		p.Active,
		id,
	).Scan(&ID)

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetTemplateModel{}, huma.Error404NotFound("Budget template not found")
	}
	if err != nil {
		observability.RecordError("database")
		return models.BudgetTemplateModel{}, huma.Error500InternalServerError("Unable to update budget template", err)
	}
	observability.RecordQueryDuration("UPDATE", "budget_templates", time.Since(queryStart).Seconds())

	return btr.GetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) Delete(ctx context.Context, id int64) error {
	return huma.Error405MethodNotAllowed("Budget templates cannot be deleted. Use PATCH to deactivate if you want to pause budget generation.")
}

func (btr BudgetTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.BudgetTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

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
				name,
				next_run_at,
				last_executed_at,
				note,
				created_at,
				updated_at,
				deleted_at
			FROM budget_templates
			WHERE deleted_at IS NULL
				AND active = true
				AND recurrence != 'none'
				AND start_date <= CURRENT_DATE
				AND (end_date IS NULL OR end_date >= CURRENT_DATE)
		),
		due_templates AS (
			SELECT *
			FROM active_templates
			WHERE next_run_at IS NULL OR next_run_at <= CURRENT_DATE
		)
		SELECT
			id,
			account_id,
			category_id,
			amount_limit,
			recurrence,
			start_date,
			end_date,
			name,
			next_run_at,
			last_executed_at,
			note,
			created_at,
			updated_at,
			deleted_at
		FROM due_templates
	`

	queryStart := time.Now()
	rows, err := btr.db.Query(ctx, sql)
	if err != nil {
		observability.RecordError("database")
		return nil, huma.Error500InternalServerError("Unable to query due budget templates", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budget_templates", time.Since(queryStart).Seconds())

	var items []models.BudgetTemplateModel
	for rows.Next() {
		var item models.BudgetTemplateModel
		if err := rows.Scan(
			&item.ID, &item.AccountID, &item.CategoryID, &item.AmountLimit, &item.Recurrence,
			&item.StartDate, &item.EndDate, &item.Name, &item.NextRunAt, &item.LastExecutedAt, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan due budget template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error500InternalServerError("Error reading due budget template rows", err)
	}

	if items == nil {
		items = []models.BudgetTemplateModel{}
	}

	return items, nil
}

func (btr BudgetTemplateRepository) UpdateLastExecuted(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE budget_templates
		SET last_executed_at = NOW(),
		    next_run_at = CASE
		        WHEN recurrence = 'weekly' THEN NOW() + INTERVAL '7 days'
		        WHEN recurrence = 'monthly' THEN NOW() + INTERVAL '1 month'
		        WHEN recurrence = 'yearly' THEN NOW() + INTERVAL '1 year'
		        ELSE next_run_at
		    END,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	_, err := btr.db.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error500InternalServerError("Unable to update budget template execution time", err)
	}
	return nil
}

func (btr BudgetTemplateRepository) GetRelatedBudgets(ctx context.Context, templateID int64, p models.BudgetTemplateRelatedBudgetsSearchModel) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		SELECT b.id
		FROM budgets b
		JOIN budget_template_relations r ON b.id = r.budget_id
		WHERE b.deleted_at IS NULL
			AND r.template_id = $1
		ORDER BY b.id
	`

	rows, err := btr.db.Query(ctx, sql, templateID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Unable to query related budget IDs", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan budget ID", err)
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error500InternalServerError("Error reading budget ID rows", err)
	}

	return ids, nil
}

func (btr BudgetTemplateRepository) CreateRelation(ctx context.Context, budgetID, templateID int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `INSERT INTO budget_template_relations (budget_id, template_id) VALUES ($1, $2) ON CONFLICT (budget_id) DO NOTHING`

	_, err := btr.db.Exec(ctx, sql, budgetID, templateID)
	if err != nil {
		return huma.Error500InternalServerError("Unable to create budget template relation", err)
	}
	return nil
}

// Budget-related methods (internal use - manages generated budgets from templates)

// calculatePeriodType determines the period type based on start and end dates
func calculateBudgetPeriodType(start, end time.Time) string {
	duration := end.Sub(start)
	days := int(duration.Hours()/24) + 1 // +1 to include both start and end dates

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

func (btr BudgetTemplateRepository) GetBudgetsPaged(ctx context.Context, query models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
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

	queryStart := time.Now()
	rows, err := btr.db.Query(ctx, sql, query.PageSize, offset, ids, templateIDs, accountIDs, categoryIDs, query.Status, query.Name)
	if err != nil {
		observability.RecordError("database")
		return models.BudgetsPagedModel{}, huma.Error400BadRequest("Unable to query budgets", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(queryStart).Seconds())

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

func (btr BudgetTemplateRepository) GetBudgetDetail(ctx context.Context, id int64) (models.BudgetModel, error) {
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

	queryStart := time.Now()
	err := btr.db.QueryRow(ctx, query, id).Scan(
		&data.ID, &data.TemplateID, &data.AccountID, &data.CategoryID, &data.PeriodStart, &data.PeriodEnd,
		&data.AmountLimit, &data.Status, &data.PeriodType, &data.Name, &data.ActualAmount, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)
	observability.RecordQueryDuration("SELECT", "budgets", time.Since(queryStart).Seconds())

	if errors.Is(err, pgx.ErrNoRows) {
		return models.BudgetModel{}, huma.Error404NotFound("Budget not found")
	}
	if err != nil {
		observability.RecordError("database")
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to query budget", err)
	}

	return data, nil
}

func (btr BudgetTemplateRepository) CreateBudget(ctx context.Context, p models.CreateBudgetModel) (models.BudgetModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	// Type assert period dates (interface{} to time.Time)
	periodStart, ok := p.PeriodStart.(time.Time)
	if !ok {
		observability.RecordError("type_assertion")
		return models.BudgetModel{}, huma.Error400BadRequest("Invalid period start type", nil)
	}

	periodEnd, ok := p.PeriodEnd.(time.Time)
	if !ok {
		observability.RecordError("type_assertion")
		return models.BudgetModel{}, huma.Error400BadRequest("Invalid period end type", nil)
	}

	// Calculate period type based on dates
	periodType := calculateBudgetPeriodType(periodStart, periodEnd)

	// Validate that only one active budget exists per account/category combination
	if err := btr.validateUniqueActiveBudget(ctx, p.AccountID, p.CategoryID, periodType); err != nil {
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
	queryStart := time.Now()
	err := btr.db.QueryRow(
		ctx,
		query,
		p.TemplateID,
		p.AccountID,
		p.CategoryID,
		periodStart,
		periodEnd,
		p.AmountLimit,
		periodType,
		p.Name,
		p.Note,
	).Scan(&ID)
	observability.RecordQueryDuration("INSERT", "budgets", time.Since(queryStart).Seconds())

	if err != nil {
		observability.RecordError("database")
		return models.BudgetModel{}, huma.Error400BadRequest("Unable to create budget", err)
	}

	return btr.GetBudgetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) UpdateBudget(ctx context.Context, id int64, p models.UpdateBudgetModel) (models.BudgetModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	current, err := btr.GetBudgetDetail(ctx, id)
	if err != nil {
		return models.BudgetModel{}, err
	}

	periodType := current.PeriodType
	periodStart := current.PeriodStart
	periodEnd := current.PeriodEnd

	if p.PeriodStart != nil {
		// Type assert period start (interface{} to time.Time)
		ps, ok := (*p.PeriodStart).(time.Time)
		if !ok {
			observability.RecordError("type_assertion")
			return models.BudgetModel{}, huma.Error400BadRequest("Invalid period start type", nil)
		}
		periodStart = ps
	}
	if p.PeriodEnd != nil {
		// Type assert period end (interface{} to time.Time)
		pe, ok := (*p.PeriodEnd).(time.Time)
		if !ok {
			observability.RecordError("type_assertion")
			return models.BudgetModel{}, huma.Error400BadRequest("Invalid period end type", nil)
		}
		periodEnd = pe
	}

	if p.PeriodStart != nil || p.PeriodEnd != nil {
		periodType = calculateBudgetPeriodType(periodStart, periodEnd)
	}

	if p.Status != nil && *p.Status == "active" {
		if err := btr.validateUniqueActiveBudget(ctx, current.AccountID, current.CategoryID, periodType); err != nil {
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
	queryStart := time.Now()
	err = btr.db.QueryRow(
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
	observability.RecordQueryDuration("UPDATE", "budgets", time.Since(queryStart).Seconds())

	if err != nil {
		observability.RecordError("database")
		return models.BudgetModel{}, huma.Error500InternalServerError("Unable to update budget", err)
	}

	return btr.GetBudgetDetail(ctx, ID)
}

func (btr BudgetTemplateRepository) DeleteBudget(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE budgets
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL`

	queryStart := time.Now()
	cmdTag, err := btr.db.Exec(ctx, sql, id)
	observability.RecordQueryDuration("DELETE", "budgets", time.Since(queryStart).Seconds())
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to delete budget", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Budget not found")
	}

	return nil
}

// validateUniqueActiveBudget ensures only one active budget exists per account/category/period_type combination
func (btr BudgetTemplateRepository) validateUniqueActiveBudget(ctx context.Context, accountID, categoryID *int64, periodType string) error {
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
	err := btr.db.QueryRow(ctx, query, accountID, categoryID, periodType).Scan(&count)
	if err != nil {
		return huma.Error500InternalServerError("Unable to validate budget uniqueness", err)
	}

	if count > 0 {
		return huma.Error400BadRequest("An active budget already exists for this account/category/period combination")
	}

	return nil
}

func (btr BudgetTemplateRepository) DeactivateExistingActiveBudgets(ctx context.Context, accountID, categoryID *int64, periodType string) error {
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

	queryStart := time.Now()
	_, err := btr.db.Exec(ctx, query, accountID, categoryID, periodType)
	observability.RecordQueryDuration("UPDATE", "budgets", time.Since(queryStart).Seconds())
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to deactivate budgets", err)
	}

	return nil
}
