package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionTemplateRepository struct {
	pgx *pgxpool.Pool
}

func NewTransactionTemplateRepository(pgx *pgxpool.Pool) TransactionTemplateRepository {
	return TransactionTemplateRepository{pgx}
}

// List retrieves paginated transaction templates with filters
func (ttr TransactionTemplateRepository) List(ctx context.Context, p models.ListTransactionTemplatesRequestModel) (models.ListTransactionTemplatesResponseModel, error) {
	// Enforce page size limits
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 10
	}
	if p.PageNumber <= 0 {
		p.PageNumber = 1
	}

	sortByMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"amount":    "amount",
		"type":      "type",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
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
	searchPattern := "%" + p.Name + "%"

	// Count total matching transaction templates
	countSQL := `SELECT COUNT(*) FROM transaction_templates WHERE deleted_at IS NULL`
	var totalCount int
	if err := ttr.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListTransactionTemplatesResponseModel{}, huma.Error400BadRequest("Unable to count transaction templates", err)
	}

	// Fetch paginated transaction templates
	sql := `SELECT id, name, type, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at
			FROM transaction_templates
			WHERE deleted_at IS NULL
			AND (name ILIKE $1 OR $1 = '%%')
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3`

	rows, err := ttr.pgx.Query(ctx, sql, searchPattern, p.PageSize, offset)
	if err != nil {
		return models.ListTransactionTemplatesResponseModel{}, huma.Error400BadRequest("Unable to query transaction templates", err)
	}
	defer rows.Close()

	var items []models.TransactionTemplateModel
	for rows.Next() {
		var item models.TransactionTemplateModel
		if err := rows.Scan(
			&item.ID, &item.Name, &item.Type, &item.Amount, &item.AccountID, &item.CategoryID,
			&item.DestinationAccountID, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return models.ListTransactionTemplatesResponseModel{}, huma.Error400BadRequest("Unable to scan transaction template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListTransactionTemplatesResponseModel{}, huma.Error400BadRequest("Error reading transaction template rows", err)
	}

	if items == nil {
		items = []models.TransactionTemplateModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.ListTransactionTemplatesResponseModel{
		Data:       items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

// Get retrieves a single transaction template by ID
func (ttr TransactionTemplateRepository) Get(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	var data models.TransactionTemplateModel

	sql := `SELECT id, name, type, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at
			FROM transaction_templates
			WHERE id = $1 AND deleted_at IS NULL`

	err := ttr.pgx.QueryRow(ctx, sql, id).Scan(
		&data.ID, &data.Name, &data.Type, &data.Amount, &data.AccountID, &data.CategoryID,
		&data.DestinationAccountID, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTemplateModel{}, huma.Error404NotFound("Transaction template not found")
		}
		return models.TransactionTemplateModel{}, huma.Error400BadRequest("Unable to query transaction template", err)
	}

	return data, nil
}

// Create creates a new transaction template
func (ttr TransactionTemplateRepository) Create(ctx context.Context, payload models.CreateTransactionTemplateRequestModel) (models.CreateTransactionTemplateResponseModel, error) {
	var data models.TransactionTemplateModel

	sql := `INSERT INTO transaction_templates (name, type, amount, account_id, category_id, destination_account_id, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, name, type, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	err := ttr.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Amount, payload.AccountID, payload.CategoryID, payload.DestinationAccountID, payload.Note).Scan(
		&data.ID, &data.Name, &data.Type, &data.Amount, &data.AccountID, &data.CategoryID,
		&data.DestinationAccountID, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if err != nil {
		return models.CreateTransactionTemplateResponseModel{}, huma.Error400BadRequest("Unable to create transaction template", err)
	}

	return models.CreateTransactionTemplateResponseModel{TransactionTemplateModel: data}, nil
}

// Update updates an existing transaction template
func (ttr TransactionTemplateRepository) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateRequestModel) (models.UpdateTransactionTemplateResponseModel, error) {
	var data models.TransactionTemplateModel

	sql := `UPDATE transaction_templates
			SET name = COALESCE($1, name),
				type = COALESCE($2, type),
				amount = COALESCE($3, amount),
				account_id = COALESCE($4, account_id),
				category_id = COALESCE($5, category_id),
				destination_account_id = COALESCE($6, destination_account_id),
				note = $7,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $8 AND deleted_at IS NULL
			RETURNING id, name, type, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	err := ttr.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Amount, payload.AccountID, payload.CategoryID, payload.DestinationAccountID, payload.Note, id).Scan(
		&data.ID, &data.Name, &data.Type, &data.Amount, &data.AccountID, &data.CategoryID,
		&data.DestinationAccountID, &data.Note, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateTransactionTemplateResponseModel{}, huma.Error404NotFound("Transaction template not found")
		}
		return models.UpdateTransactionTemplateResponseModel{}, huma.Error400BadRequest("Unable to update transaction template", err)
	}

	return models.UpdateTransactionTemplateResponseModel{TransactionTemplateModel: data}, nil
}

// Delete soft deletes a transaction template
func (ttr TransactionTemplateRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE transaction_templates
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := ttr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction template", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction template not found")
	}
	return nil
}

// GetDueTemplates retrieves templates that are due for processing based on their recurrence patterns
func (ttr TransactionTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.TransactionTemplateModel, error) {
	// Query templates that:
	// 1. Are not deleted
	// 2. Have recurrence set to something other than 'none'
	// 3. Start date is today or in the past
	// 4. End date is NULL or today or in the future
	// 5. Either have never been executed (last_executed_at IS NULL) or are due based on recurrence
	sql := `
		SELECT id, name, type, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at
		FROM transaction_templates
		WHERE deleted_at IS NULL
		  AND recurrence != 'none'
		  AND start_date <= CURRENT_DATE
		  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
		  AND (
		    last_executed_at IS NULL
		    OR (
		      recurrence = 'daily' AND last_executed_at < NOW() - INTERVAL '1 day'
		    )
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

	rows, err := ttr.pgx.Query(ctx, sql)
	if err != nil {
		return nil, huma.Error400BadRequest("Unable to query due transaction templates", err)
	}
	defer rows.Close()

	var items []models.TransactionTemplateModel
	for rows.Next() {
		var item models.TransactionTemplateModel
		if err := rows.Scan(
			&item.ID, &item.Name, &item.Type, &item.Amount, &item.AccountID, &item.CategoryID,
			&item.DestinationAccountID, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return nil, huma.Error400BadRequest("Unable to scan due transaction template data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error400BadRequest("Error reading due transaction template rows", err)
	}

	if items == nil {
		items = []models.TransactionTemplateModel{}
	}

	return items, nil
}

// UpdateLastExecuted updates the last_executed_at timestamp for a template
func (ttr TransactionTemplateRepository) UpdateLastExecuted(ctx context.Context, id int64) error {
	sql := `
		UPDATE transaction_templates
		SET last_executed_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	_, err := ttr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to update template execution time", err)
	}
	return nil
}
