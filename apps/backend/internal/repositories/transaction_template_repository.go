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

type TransactionTemplateRepository struct {
	db DBQuerier
}

func NewTransactionTemplateRepository(db DBQuerier) TransactionTemplateRepository {
	return TransactionTemplateRepository{db}
}

func (ttr TransactionTemplateRepository) GetPaged(ctx context.Context, p models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sortByMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"amount":    "amount",
		"type":      "type",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
		"nextDueAt": "next_due_at",
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
				tt.next_due_at,
				tt.last_executed_at,
				tt.created_at,
				tt.updated_at,
				tt.deleted_at,
				COUNT(r.transaction_id) as occurrences,
				COALESCE(SUM(t.amount), 0) as total_spent,
				CASE
					WHEN tt.end_date IS NULL THEN NULL
					WHEN tt.recurrence = 'none' THEN NULL
				WHEN tt.recurrence = 'weekly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 604800)::bigint) + 1
				WHEN tt.recurrence = 'monthly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 2629746)::bigint) + 1
				WHEN tt.recurrence = 'yearly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 31556952)::bigint) + 1
					ELSE NULL
				END as remaining,
				COUNT(*) OVER() as total_count
			FROM transaction_templates tt
			JOIN accounts a ON tt.account_id = a.id
			JOIN categories c ON tt.category_id = c.id
			LEFT JOIN accounts da ON tt.destination_account_id = da.id
			LEFT JOIN transaction_template_relations r ON r.template_id = tt.id
			LEFT JOIN transactions t ON r.transaction_id = t.id AND t.deleted_at IS NULL
			WHERE tt.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND c.deleted_at IS NULL
				AND (da.deleted_at IS NULL OR da.id IS NULL)
				AND ($1::text = '' OR tt.name ILIKE '%' || $1::text || '%')
				AND ($2::text = '' OR tt.type = $2::text)
				AND ($3::int8 = 0 OR tt.account_id = $3::int8)
				AND ($4::int8 = 0 OR tt.category_id = $4::int8)
				AND ($5::int8 = 0 OR tt.destination_account_id = $5::int8)
			GROUP BY tt.id, a.id, a.name, a.type, a.amount, a.icon, a.icon_color, c.id, c.name, c.type, c.icon, c.icon_color, da.id, da.name, da.type, da.amount, da.icon, da.icon_color, tt.name, tt.type, tt.amount, tt.note, tt.recurrence, tt.start_date, tt.end_date, tt.next_due_at, tt.last_executed_at, tt.created_at, tt.updated_at, tt.deleted_at
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
			next_due_at,
			last_executed_at,
			created_at,
			updated_at,
			deleted_at,
			occurrences,
			total_spent,
			remaining,
			total_count
		FROM filtered_templates
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
		LIMIT $6::bigint OFFSET $7::bigint
	`

	queryStart := time.Now()
	rows, err := ttr.db.Query(ctx, sql, searchPattern, p.Type, p.AccountID, p.CategoryID, p.DestinationAccountID, p.PageSize, offset)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionTemplatesPagedModel{}, huma.Error500InternalServerError("Unable to query transaction templates", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transaction_templates", time.Since(queryStart).Seconds())

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
			&item.Note, &item.Recurrence, &item.StartDate, &item.EndDate, &item.NextDueAt, &item.LastExecutedAt,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&item.RecurringStats.Occurrences, &item.RecurringStats.TotalSpent, &item.RecurringStats.Remaining, &totalCount,
		); err != nil {
			return models.TransactionTemplatesPagedModel{}, huma.Error500InternalServerError("Unable to scan transaction template data", err)
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
		return models.TransactionTemplatesPagedModel{}, huma.Error500InternalServerError("Error reading transaction template rows", err)
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
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

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
			tt.next_due_at,
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

	queryStart := time.Now()
	err := ttr.db.QueryRow(ctx, sql, id).Scan(
		&data.ID, &data.Name, &data.Type, &data.Amount,
		&data.Account.ID, &data.Account.Name, &data.Account.Type, &data.Account.Amount,
		&data.Account.Icon, &data.Account.IconColor,
		&data.Category.ID, &data.Category.Name, &data.Category.Type, &data.Category.Icon, &data.Category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountIconColor,
		&data.Note, &data.Recurrence, &data.StartDate, &data.EndDate, &data.NextDueAt, &data.LastExecutedAt,
		&data.CreatedAt, &data.UpdatedAt, &data.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTemplateModel{}, huma.Error404NotFound("Transaction template not found")
		}
		observability.RecordError("database")
		return models.TransactionTemplateModel{}, huma.Error500InternalServerError("Unable to query transaction template", err)
	}
	observability.RecordQueryDuration("SELECT", "transaction_templates", time.Since(queryStart).Seconds())

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

	// Calculate recurring stats
	statsSQL := `
		SELECT
			COUNT(r.transaction_id) as occurrences,
			COALESCE(SUM(t.amount), 0) as total_spent
		FROM transaction_template_relations r
		LEFT JOIN transactions t ON r.transaction_id = t.id AND t.deleted_at IS NULL
		WHERE r.template_id = $1
	`

	queryStart2 := time.Now()
	err = ttr.db.QueryRow(ctx, statsSQL, id).Scan(
		&data.RecurringStats.Occurrences,
		&data.RecurringStats.TotalSpent,
	)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionTemplateModel{}, huma.Error500InternalServerError("Unable to query transaction template stats", err)
	}
	observability.RecordQueryDuration("SELECT", "transaction_template_relations", time.Since(queryStart2).Seconds())

	// Calculate remaining (matches SQL formula in GetPaged)
	if data.EndDate != nil && data.Recurrence != "none" {
		var intervalSeconds int64
		switch data.Recurrence {
		case "weekly":
			intervalSeconds = 604800
		case "monthly":
			intervalSeconds = 2629746
		case "yearly":
			intervalSeconds = 31556952
		default:
			data.RecurringStats.Remaining = nil
			return data, nil
		}

		baseTime := data.StartDate
		if data.LastExecutedAt != nil {
			baseTime = *data.LastExecutedAt
		}

		timeDiff := data.EndDate.Sub(baseTime)
		if timeDiff > 0 {
			remaining := int64(timeDiff.Seconds()/float64(intervalSeconds)) + 1
			if remaining < 1 {
				remaining = 1
			}
			data.RecurringStats.Remaining = &remaining
		} else {
			remaining := int64(1)
			data.RecurringStats.Remaining = &remaining
		}
	} else {
		data.RecurringStats.Remaining = nil
	}

	return data, nil
}

func (ttr TransactionTemplateRepository) Create(ctx context.Context, payload models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var ID int64

	// Calculate next_due_at
	var nextDueAt *time.Time
	if payload.Recurrence != "none" {
		nextDueAt = &payload.StartDate
	}

	sql := `
		INSERT INTO transaction_templates (name, type, amount, account_id, category_id, destination_account_id, note, recurrence, start_date, end_date, next_due_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id
	`

	queryStart := time.Now()
	err := ttr.db.QueryRow(
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
		nextDueAt,
	).Scan(&ID)

	if err != nil {
		observability.RecordError("database")
		return models.TransactionTemplateModel{}, huma.Error500InternalServerError("Unable to create transaction template", err)
	}
	observability.RecordQueryDuration("INSERT", "transaction_templates", time.Since(queryStart).Seconds())

	return ttr.GetDetail(ctx, ID)
}

// Update updates an existing transaction template
func (ttr TransactionTemplateRepository) Update(ctx context.Context, id int64, payload models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

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
			end_date = COALESCE($9, end_date),
			next_due_at = CASE 
				WHEN COALESCE($8, recurrence) != recurrence OR COALESCE($9, end_date) != end_date THEN 
					CASE 
						WHEN COALESCE($8, recurrence) = 'none' THEN NULL
						ELSE CASE
							WHEN last_executed_at IS NOT NULL THEN 
								CASE COALESCE($8, recurrence)
									WHEN 'weekly' THEN last_executed_at + INTERVAL '7 days'
									WHEN 'monthly' THEN last_executed_at + INTERVAL '1 month'
									WHEN 'yearly' THEN last_executed_at + INTERVAL '1 year'
									ELSE last_executed_at
								END
							ELSE start_date
						END
					END
				ELSE next_due_at
			END,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $10 AND deleted_at IS NULL
		RETURNING id
	`

	queryStart := time.Now()
	var returnedID int64
	err := ttr.db.QueryRow(
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
		payload.EndDate,
		id,
	).Scan(&returnedID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionTemplateModel{}, huma.Error404NotFound("Transaction template not found")
		}
		observability.RecordError("database")
		return models.TransactionTemplateModel{}, huma.Error500InternalServerError("Unable to update transaction template", err)
	}
	observability.RecordQueryDuration("UPDATE", "transaction_templates", time.Since(queryStart).Seconds())

	return ttr.GetDetail(ctx, returnedID)
}

func (ttr TransactionTemplateRepository) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE transaction_templates
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	queryStart := time.Now()
	cmdTag, err := ttr.db.Exec(ctx, sql, id)
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to delete transaction template", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction template not found")
	}
	observability.RecordQueryDuration("DELETE", "transaction_templates", time.Since(queryStart).Seconds())
	return nil
}

func (ttr TransactionTemplateRepository) GetDueTemplates(ctx context.Context) ([]models.TransactionTemplateModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		SELECT
			tt.id,
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
			tt.name,
			tt.type,
			tt.amount,
			tt.note,
			tt.recurrence,
			tt.start_date,
			tt.end_date,
			tt.next_due_at,
			tt.last_executed_at,
			tt.created_at,
			tt.updated_at,
			tt.deleted_at,
			COUNT(r.transaction_id) as occurrences,
			COALESCE(SUM(t.amount), 0) as total_spent,
			CASE
				WHEN tt.end_date IS NULL THEN NULL
				WHEN tt.recurrence = 'none' THEN NULL
				WHEN tt.recurrence = 'weekly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 604800)::bigint) + 1
				WHEN tt.recurrence = 'monthly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 2629746)::bigint) + 1
				WHEN tt.recurrence = 'yearly' THEN GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (tt.end_date - COALESCE(tt.last_executed_at, tt.start_date))) / 31556952)::bigint) + 1
				ELSE NULL
			END as remaining
		FROM transaction_templates tt
		JOIN accounts a ON tt.account_id = a.id
		JOIN categories c ON tt.category_id = c.id
		LEFT JOIN accounts da ON tt.destination_account_id = da.id
		LEFT JOIN transaction_template_relations r ON r.template_id = tt.id
		LEFT JOIN transactions t ON r.transaction_id = t.id AND t.deleted_at IS NULL
		WHERE tt.deleted_at IS NULL
			AND tt.next_due_at <= CURRENT_DATE
			AND a.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND (da.deleted_at IS NULL OR da.id IS NULL)
		GROUP BY tt.id, a.id, a.name, a.type, a.amount, a.icon, a.icon_color, c.id, c.name, c.type, c.icon, c.icon_color, da.id, da.name, da.type, da.amount, da.icon, da.icon_color, tt.name, tt.type, tt.amount, tt.note, tt.recurrence, tt.start_date, tt.end_date, tt.next_due_at, tt.last_executed_at, tt.created_at, tt.updated_at, tt.deleted_at
		ORDER BY tt.next_due_at ASC
	`

	queryStart := time.Now()
	rows, err := ttr.db.Query(ctx, sql)
	if err != nil {
		observability.RecordError("database")
		return nil, huma.Error500InternalServerError("Unable to query due transaction templates", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transaction_templates", time.Since(queryStart).Seconds())

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
			&item.Recurrence, &item.StartDate, &item.EndDate, &item.NextDueAt, &item.LastExecutedAt,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&item.RecurringStats.Occurrences, &item.RecurringStats.TotalSpent, &item.RecurringStats.Remaining,
		); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan due transaction template data", err)
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
		return nil, huma.Error500InternalServerError("Error reading due transaction template rows", err)
	}

	if items == nil {
		items = []models.TransactionTemplateModel{}
	}

	return items, nil
}

func (ttr TransactionTemplateRepository) UpdateLastExecuted(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		UPDATE transaction_templates
		SET last_executed_at = NOW(),
		    next_due_at = CASE
		        WHEN recurrence = 'weekly' THEN NOW() + INTERVAL '7 days'
		        WHEN recurrence = 'monthly' THEN NOW() + INTERVAL '1 month'
		        WHEN recurrence = 'yearly' THEN NOW() + INTERVAL '1 year'
		        ELSE next_due_at
		    END,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	_, err := ttr.db.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error500InternalServerError("Unable to update template execution time", err)
	}
	return nil
}

func (ttr TransactionTemplateRepository) CreateRelation(ctx context.Context, transactionID, templateID int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `INSERT INTO transaction_template_relations (transaction_id, template_id) VALUES ($1, $2) ON CONFLICT (transaction_id) DO NOTHING`

	_, err := ttr.db.Exec(ctx, sql, transactionID, templateID)
	if err != nil {
		return huma.Error500InternalServerError("Unable to create transaction template relation", err)
	}
	return nil
}

func (ttr TransactionTemplateRepository) GetRelatedTransactions(ctx context.Context, templateID int64, p models.TransactionTemplateRelatedTransactionsSearchModel) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		SELECT t.id
		FROM transactions t
		JOIN transaction_template_relations r ON t.id = r.transaction_id
		WHERE t.deleted_at IS NULL
			AND r.template_id = $1
		ORDER BY t.id
	`

	rows, err := ttr.db.Query(ctx, sql, templateID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Unable to query related transaction IDs", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan transaction ID", err)
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error500InternalServerError("Error reading transaction ID rows", err)
	}

	return ids, nil
}
