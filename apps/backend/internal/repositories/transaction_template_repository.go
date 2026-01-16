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

func (ttr TransactionTemplateRepository) GetPaged(ctx context.Context, p models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
	sortByMap := map[string]string{
		"id":        "tt.id",
		"name":      "tt.name",
		"amount":    "tt.amount",
		"type":      "tt.type",
		"createdAt": "tt.created_at",
		"updatedAt": "tt.updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn := sortByMap[p.SortBy]
	sortOrder := sortOrderMap[p.SortOrder]

	offset := (p.PageNumber - 1) * p.PageSize
	searchPattern := "%" + p.Name + "%"

	sql := `
		WITH filtered_templates AS (
			SELECT
				tt.id,
				tt.name,
				tt.type,
				tt.amount,
				a.id as account_id,
				a.name as account_name,
				a.type as account_type,
				a.amount as account_amount,
				a.icon as account_icon,
				a.icon_color as account_icon_color,
				c.id as category_id,
				c.name as category_name,
				c.type as category_type,
				c.icon as category_icon,
				c.icon_color as category_icon_color,
				da.id as dest_account_id,
				da.name as dest_account_name,
				da.type as dest_account_type,
				da.amount as dest_account_amount,
				da.icon as dest_account_icon,
				da.icon_color as dest_account_icon_color,
				tt.note,
				tt.recurrence,
				tt.start_date,
				tt.end_date,
				tt.last_executed_at,
				tt.created_at,
				tt.updated_at,
				tt.deleted_at,
				COUNT(*) OVER() as total_count
			FROM transaction_templates tt
			JOIN accounts a ON tt.account_id = a.id
			JOIN categories c ON tt.category_id = c.id
			LEFT JOIN accounts da ON tt.destination_account_id = da.id
			WHERE tt.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND c.deleted_at IS NULL
				AND (da.deleted_at IS NULL OR da.id IS NULL)
				AND ($3::text IS NULL OR $3::text = '' OR tt.name ILIKE '%' || $3::text || '%')
				AND ($4::text IS NULL OR tt.type = $4::text)
				AND ($5::int8 IS NULL OR tt.account_id = $5::int8)
				AND ($6::int8 IS NULL OR tt.category_id = $6::int8)
				AND ($7::int8 IS NULL OR tt.destination_account_id = $7::int8)
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
		)
		SELECT
			id,
			name,
			type,
			amount,
			account_id,
			account_name,
			account_type,
			account_amount,
			account_icon,
			account_icon_color,
			category_id,
			category_name,
			category_type,
			category_icon,
			category_icon_color,
			dest_account_id,
			dest_account_name,
			dest_account_type,
			dest_account_amount,
			dest_account_icon,
			dest_account_icon_color,
			note,
			recurrence,
			start_date,
			end_date,
			last_executed_at,
			created_at,
			updated_at,
			deleted_at,
			total_count
		FROM filtered_templates
	`

	rows, err := ttr.pgx.Query(ctx, sql, p.PageSize, offset, searchPattern, p.Type, p.AccountID, p.CategoryID, p.DestinationAccountID)
	if err != nil {
		return models.TransactionTemplatesPagedModel{}, huma.Error400BadRequest("Unable to query transaction templates", err)
	}
	defer rows.Close()

	var items []models.TransactionTemplateModel
	var totalCount int
	for rows.Next() {
		var item models.TransactionTemplateModel
		var destAccountID *int64
		var destAccountName *string
		var destAccountType *string
		var destAccountAmount *int64
		var destAccountIcon *string
		var destAccountIconColor *string

		if err := rows.Scan(
			&item.ID, &item.Name, &item.Type, &item.Amount,
			&item.Account.ID, &item.Account.Name, &item.Account.Type, &item.Account.Amount,
			&item.Account.Icon, &item.Account.IconColor,
			&item.Category.ID, &item.Category.Name, &item.Category.Type, &item.Category.Icon, &item.Category.IconColor,
			&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountIconColor,
			&item.Note, &item.Recurrence, &item.StartDate, &item.EndDate, &item.LastExecutedAt,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&totalCount,
		); err != nil {
			return models.TransactionTemplatesPagedModel{}, huma.Error400BadRequest("Unable to scan transaction template data", err)
		}

		// Set destination account if present
		if destAccountID != nil {
			item.DestinationAccount = &models.TransactionAccountEmbedded{
				ID:        *destAccountID,
				Name:      *destAccountName,
				Type:      *destAccountType,
				Amount:    *destAccountAmount,
				Icon:      destAccountIcon,
				IconColor: destAccountIconColor,
			}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TransactionTemplatesPagedModel{}, huma.Error400BadRequest("Error reading transaction template rows", err)
	}

	if items == nil {
		items = []models.TransactionTemplateModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.TransactionTemplatesPagedModel{
		Items:      items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (ttr TransactionTemplateRepository) GetDetail(ctx context.Context, id int64) (models.TransactionTemplateModel, error) {
	var data models.TransactionTemplateModel
	var destAccountID *int64
	var destAccountName *string
	var destAccountType *string
	var destAccountAmount *int64
	var destAccountIcon *string
	var destAccountIconColor *string

	sql := `
		SELECT
			tt.id,
			tt.name,
			tt.type,
			tt.amount,
			a.id,
			a.name,
			a.type,
			a.amount,
			a.icon,
			a.icon_color,
			c.id,
			c.name,
			c.type,
			c.icon,
			c.icon_color,
			da.id,
			da.name,
			da.type,
			da.amount,
			da.icon,
			da.icon_color,
			tt.note,
			tt.recurrence,
			tt.start_date,
			tt.end_date,
			tt.last_executed_at,
			tt.created_at,
			tt.updated_at,
			tt.deleted_at
		FROM transaction_templates tt
		JOIN accounts a ON tt.account_id = a.id
		JOIN categories c ON tt.category_id = c.id
		LEFT JOIN accounts da ON tt.destination_account_id = da.id
		WHERE tt.id = $1 AND tt.deleted_at IS NULL
			AND a.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND (da.deleted_at IS NULL OR da.id IS NULL)
	`

	err := ttr.pgx.QueryRow(ctx, sql, id).Scan(
		&data.ID, &data.Name, &data.Type, &data.Amount,
		&data.Account.ID, &data.Account.Name, &data.Account.Type, &data.Account.Amount,
		&data.Account.Icon, &data.Account.IconColor,
		&data.Category.ID, &data.Category.Name, &data.Category.Type, &data.Category.Icon, &data.Category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountIconColor,
		&data.Note, &data.Recurrence, &data.StartDate, &data.EndDate, &data.LastExecutedAt,
		&data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTemplateModel{}, huma.Error404NotFound("Transaction template not found")
		}
		return models.TransactionTemplateModel{}, huma.Error400BadRequest("Unable to query transaction template", err)
	}

	// Set destination account if present
	if destAccountID != nil {
		data.DestinationAccount = &models.TransactionAccountEmbedded{
			ID:        *destAccountID,
			Name:      *destAccountName,
			Type:      *destAccountType,
			Amount:    *destAccountAmount,
			Icon:      destAccountIcon,
			IconColor: destAccountIconColor,
		}
	}

	return data, nil
}

func (ttr TransactionTemplateRepository) Create(ctx context.Context, payload models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	var ID int64

	sql := `
		INSERT INTO transaction_templates (name, type, amount, account_id, category_id, destination_account_id, note, recurrence, start_date, end_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`

	err := ttr.pgx.QueryRow(
		ctx,
		sql,
		payload.Name,
		payload.Type,
		payload.Amount,
		payload.AccountID,
		payload.CategoryID,
		payload.DestinationAccountID,
		payload.Note,
		payload.Recurrence,
		payload.StartDate,
		payload.EndDate,
	).Scan(&ID)

	if err != nil {
		return models.TransactionTemplateModel{}, huma.Error400BadRequest("Unable to create transaction template", err)
	}

	return ttr.GetDetail(ctx, ID)
}

// Update updates an existing transaction template
func (ttr TransactionTemplateRepository) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	sql := `
		UPDATE transaction_templates
		SET name = COALESCE($1, name),
			type = COALESCE($2, type),
			amount = COALESCE($3, amount),
			account_id = COALESCE($4, account_id),
			category_id = COALESCE($5, category_id),
			destination_account_id = COALESCE($6, destination_account_id),
			note = COALESCE($7, note),
			recurrence = COALESCE($8, recurrence),
			start_date = COALESCE($9, start_date),
			end_date = COALESCE($10, end_date),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $11 AND deleted_at IS NULL
		RETURNING id
	`

	var returnedID int64
	err := ttr.pgx.QueryRow(
		ctx,
		sql,
		payload.Name,
		payload.Type,
		payload.Amount,
		payload.AccountID,
		payload.CategoryID,
		payload.DestinationAccountID,
		payload.Note,
		payload.Recurrence,
		payload.StartDate,
		payload.EndDate,
		id,
	).Scan(&returnedID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTemplateModel{}, huma.Error404NotFound("Transaction template not found")
		}
		return models.TransactionTemplateModel{}, huma.Error400BadRequest("Unable to update transaction template", err)
	}

	return ttr.GetDetail(ctx, returnedID)
}

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

func (ttr TransactionTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.TransactionTemplateModel, error) {
	sql := `
		WITH active_templates AS (
			SELECT
				id,
				account_id,
				category_id,
				destination_account_id,
				name,
				type,
				amount,
				note,
				recurrence,
				start_date,
				end_date,
				last_executed_at,
				created_at,
				updated_at,
				deleted_at
			FROM transaction_templates
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
			dt.id,
			a.id,
			a.name,
			a.type,
			a.amount,
			a.icon,
			a.icon_color,
			c.id,
			c.name,
			c.type,
			c.icon,
			c.icon_color,
			da.id,
			da.name,
			da.type,
			da.amount,
			da.icon,
			da.icon_color,
			dt.name,
			dt.type,
			dt.amount,
			dt.note,
			dt.recurrence,
			dt.start_date,
			dt.end_date,
			dt.last_executed_at,
			dt.created_at,
			dt.updated_at,
			dt.deleted_at
		FROM due_templates dt
		JOIN accounts a ON dt.account_id = a.id
		JOIN categories c ON dt.category_id = c.id
		LEFT JOIN accounts da ON dt.destination_account_id = da.id
		WHERE a.deleted_at IS NULL AND c.deleted_at IS NULL AND (da.deleted_at IS NULL OR da.id IS NULL)
		ORDER BY dt.created_at ASC
	`

	rows, err := ttr.pgx.Query(ctx, sql)
	if err != nil {
		return nil, huma.Error400BadRequest("Unable to query due transaction templates", err)
	}
	defer rows.Close()

	var items []models.TransactionTemplateModel
	for rows.Next() {
		var item models.TransactionTemplateModel
		var destAccountID *int64
		var destAccountName *string
		var destAccountType *string
		var destAccountAmount *int64
		var destAccountIcon *string
		var destAccountIconColor *string

		if err := rows.Scan(
			&item.ID,
			&item.Account.ID, &item.Account.Name, &item.Account.Type, &item.Account.Amount,
			&item.Account.Icon, &item.Account.IconColor,
			&item.Category.ID, &item.Category.Name, &item.Category.Type, &item.Category.Icon, &item.Category.IconColor,
			&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountIconColor,
			&item.Name, &item.Type, &item.Amount, &item.Note,
			&item.Recurrence, &item.StartDate, &item.EndDate, &item.LastExecutedAt,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		); err != nil {
			return nil, huma.Error400BadRequest("Unable to scan due transaction template data", err)
		}

		if destAccountID != nil {
			item.DestinationAccount = &models.TransactionAccountEmbedded{
				ID:        *destAccountID,
				Name:      *destAccountName,
				Type:      *destAccountType,
				Amount:    *destAccountAmount,
				Icon:      destAccountIcon,
				IconColor: destAccountIconColor,
			}
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
