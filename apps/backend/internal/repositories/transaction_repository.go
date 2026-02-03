package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/jackc/pgx/v5"
)

type TransactionRepository struct {
	db DBQuerier
}

func NewTransactionRepository(db DBQuerier) TransactionRepository {
	return TransactionRepository{db: db}
}

func (tr TransactionRepository) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sortByMap := map[string]string{
		"id":        "id",
		"type":      "type",
		"date":      "date",
		"amount":    "amount",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn := sortByMap[p.SortBy]
	sortOrder := sortOrderMap[p.SortOrder]
	offset := (p.PageNumber - 1) * p.PageSize

	sql := `
		WITH filtered_transactions AS (
			SELECT 
				t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
				tt.id as template_id, tt.name as template_name, tt.amount as template_amount, tt.recurrence as template_recurrence, tt.start_date as template_start_date, tt.end_date as template_end_date,
				a.id as account_id, a.name as account_name, a.type as account_type, a.amount as account_amount, a.icon as account_icon, a.icon_color as account_color,
				c.id as category_id, c.name as category_name, c.type as category_type, c.icon as category_icon, c.icon_color as category_color,
				da.id as dest_account_id, da.name as dest_account_name, da.type as dest_account_type, da.amount as dest_account_amount, da.icon as dest_account_icon, da.icon_color as dest_account_color,
				COUNT(*) OVER() as total_count
			FROM transactions t
			LEFT JOIN transaction_template_relations r ON r.transaction_id = t.id
			LEFT JOIN transaction_templates tt ON r.template_id = tt.id
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.deleted_at IS NULL
				AND (array_length($3::int8[], 1) IS NULL OR t.id = ANY($3::int8[]))
				AND (array_length($4::text[], 1) IS NULL OR t.type = ANY($4::text[]))
				AND (array_length($5::int8[], 1) IS NULL OR t.account_id = ANY($5::int8[]) OR t.destination_account_id = ANY($5::int8[]))
				AND (array_length($6::int8[], 1) IS NULL OR t.category_id = ANY($6::int8[]))
				AND (array_length($7::int8[], 1) IS NULL OR t.destination_account_id = ANY($7::int8[]) OR t.destination_account_id IS NULL)
				AND ($8::int8 IS NULL OR t.amount >= $8::int8)
				AND ($9::int8 IS NULL OR t.amount <= $9::int8)
				AND ($10::timestamptz IS NULL OR t.date >= $10::timestamptz)
				AND ($11::timestamptz IS NULL OR t.date <= $11::timestamptz)
				AND (array_length($12::int8[], 1) IS NULL OR tt.id = ANY($12::int8[]))
				AND (array_length($13::int8[], 1) IS NULL OR t.id IN (
						SELECT DISTINCT tt.transaction_id
						FROM transaction_tags tt
						WHERE tt.tag_id = ANY($13::int8[])
					))
			ORDER BY t.` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
		),
		tags_agg AS (
			SELECT tt.transaction_id,
				COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', t.id, 'name', t.name) ORDER BY t.name), '[]'::json) as tags_json
			FROM transaction_tags tt
			INNER JOIN tags t ON tt.tag_id = t.id
			WHERE tt.transaction_id IN (SELECT id FROM filtered_transactions)
			GROUP BY tt.transaction_id
		)
		SELECT
			ft.id, ft.type, ft.date, ft.amount, ft.note, ft.created_at, ft.updated_at, ft.deleted_at,
			ft.template_id, ft.template_name, ft.template_amount, ft.template_recurrence, ft.template_start_date, ft.template_end_date,
			ft.account_id, ft.account_name, ft.account_type, ft.account_amount, ft.account_icon, ft.account_color,
			ft.category_id, ft.category_name, ft.category_type, ft.category_icon, ft.category_color,
			ft.dest_account_id, ft.dest_account_name, ft.dest_account_type, ft.dest_account_amount, ft.dest_account_icon, ft.dest_account_color,
			COALESCE(ta.tags_json, '[]'::json) as tags_json,
			ft.total_count
		FROM filtered_transactions ft
		LEFT JOIN tags_agg ta ON ft.id = ta.transaction_id
		ORDER BY ft.` + sortColumn + ` ` + sortOrder + `
	`

	var (
		ids            []int64
		types          []string
		accountIDs     []int64
		categoryIDs    []int64
		destAccountIDs []int64
		templateIDs    []int64
		tagIDs         []int64
		minAmountParam *int64
		maxAmountParam *int64
		startDateParam *string
		endDateParam   *string
	)

	if len(p.IDs) > 0 {
		for _, id := range p.IDs {
			ids = append(ids, int64(id))
		}
	}
	if len(p.Type) > 0 {
		types = p.Type
	}
	if len(p.AccountIDs) > 0 {
		for _, id := range p.AccountIDs {
			accountIDs = append(accountIDs, int64(id))
		}
	}
	if len(p.CategoryIDs) > 0 {
		for _, id := range p.CategoryIDs {
			categoryIDs = append(categoryIDs, int64(id))
		}
	}
	if len(p.DestinationAccountIDs) > 0 {
		for _, id := range p.DestinationAccountIDs {
			destAccountIDs = append(destAccountIDs, int64(id))
		}
	}
	if len(p.TemplateIDs) > 0 {
		for _, id := range p.TemplateIDs {
			templateIDs = append(templateIDs, int64(id))
		}
	}
	if len(p.TagIDs) > 0 {
		for _, id := range p.TagIDs {
			tagIDs = append(tagIDs, int64(id))
		}
	}
	if p.MinAmount > 0 {
		minAmountParam = &p.MinAmount
	}
	if p.MaxAmount > 0 {
		maxAmountParam = &p.MaxAmount
	}
	if p.StartDate != "" {
		startDateParam = &p.StartDate
	}
	if p.EndDate != "" {
		endDateParam = &p.EndDate
	}

	queryStart := time.Now()
	rows, err := tr.db.Query(ctx, sql,
		p.PageSize, offset,
		ids, types, accountIDs, categoryIDs, destAccountIDs,
		minAmountParam, maxAmountParam,
		startDateParam, endDateParam,
		templateIDs, tagIDs,
	)
	if err != nil {
		observability.RecordError("database")
		return models.TransactionsPagedModel{}, huma.Error500InternalServerError("Unable to query transactions", err)
	}
	defer rows.Close()
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	var items []models.TransactionModel
	var totalCount int

	for rows.Next() {
		var item models.TransactionModel
		var account models.TransactionAccountEmbedded
		var category models.TransactionCategoryEmbedded
		var destAccount *models.TransactionAccountEmbedded
		var destAccountID *int64
		var destAccountName *string
		var destAccountType *string
		var destAccountAmount *int64
		var destAccountIcon *string
		var destAccountColor *string
		var tagsJSON []byte
		var templateID *int64
		var templateName *string
		var templateAmount *int64
		var templateRecurrence *string
		var templateStartDate *time.Time
		var templateEndDate *time.Time

		err := rows.Scan(
			&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&templateID, &templateName, &templateAmount, &templateRecurrence, &templateStartDate, &templateEndDate,
			&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
			&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
			&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
			&tagsJSON,
			&totalCount,
		)
		if err != nil {
			return models.TransactionsPagedModel{}, huma.Error500InternalServerError("Unable to scan transaction data", err)
		}

		item.Account = account
		item.Category = category

		if destAccountID != nil {
			destAccount = &models.TransactionAccountEmbedded{
				ID:        *destAccountID,
				Name:      *destAccountName,
				Type:      *destAccountType,
				Amount:    *destAccountAmount,
				Icon:      destAccountIcon,
				IconColor: destAccountColor,
			}
			item.DestinationAccount = destAccount
		}

		item.Tags = []models.TransactionTagEmbedded{}
		if len(tagsJSON) > 0 {
			if err := json.Unmarshal(tagsJSON, &item.Tags); err != nil {
				return models.TransactionsPagedModel{}, huma.Error500InternalServerError("Unable to parse tags data", err)
			}
		}

		if templateID != nil {
			item.Template = &models.TransactionTemplateEmbedded{
				ID:         *templateID,
				Name:       *templateName,
				Amount:     *templateAmount,
				Recurrence: *templateRecurrence,
				StartDate:  *templateStartDate,
				EndDate:    templateEndDate,
			}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TransactionsPagedModel{}, huma.Error500InternalServerError("Error reading transaction rows", err)
	}

	if items == nil {
		items = []models.TransactionModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.TransactionsPagedModel{
		Items:      items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (tr TransactionRepository) GetDetail(ctx context.Context, id int64) (models.TransactionModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var item models.TransactionModel
	var account models.TransactionAccountEmbedded
	var category models.TransactionCategoryEmbedded
	var destAccount *models.TransactionAccountEmbedded
	var destAccountID *int64
	var destAccountName *string
	var destAccountType *string
	var destAccountAmount *int64
	var destAccountIcon *string
	var destAccountColor *string
	var tagsJSON []byte
	var templateID *int64
	var templateName *string
	var templateAmount *int64
	var templateRecurrence *string
	var templateStartDate *time.Time
	var templateEndDate *time.Time

	sql := `
		WITH transaction_detail AS (
			SELECT t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
				tt.id as template_id, tt.name as template_name, tt.amount as template_amount, tt.recurrence as template_recurrence, tt.start_date as template_start_date, tt.end_date as template_end_date,
				a.id as account_id, a.name as account_name, a.type as account_type, a.amount as account_amount, a.icon as account_icon, a.icon_color as account_color,
				c.id as category_id, c.name as category_name, c.type as category_type, c.icon as category_icon, c.icon_color as category_color,
				da.id as dest_account_id, da.name as dest_account_name, da.type as dest_account_type, da.amount as dest_account_amount, da.icon as dest_account_icon, da.icon_color as dest_account_color
			FROM transactions t
			LEFT JOIN transaction_template_relations r ON r.transaction_id = t.id
			LEFT JOIN transaction_templates tt ON r.template_id = tt.id
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.id = $1 AND t.deleted_at IS NULL
		),
		tags_agg AS (
			SELECT tt.transaction_id,
				COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', t.id, 'name', t.name) ORDER BY t.name), '[]'::json) as tags_json
			FROM transaction_tags tt
			INNER JOIN tags t ON tt.tag_id = t.id
			WHERE tt.transaction_id = $1
			GROUP BY tt.transaction_id
		)
		SELECT
			td.id, td.type, td.date, td.amount, td.note, td.created_at, td.updated_at, td.deleted_at,
			td.template_id, td.template_name, td.template_amount, td.template_recurrence, td.template_start_date, td.template_end_date,
			td.account_id, td.account_name, td.account_type, td.account_amount, td.account_icon, td.account_color,
			td.category_id, td.category_name, td.category_type, td.category_icon, td.category_color,
			td.dest_account_id, td.dest_account_name, td.dest_account_type, td.dest_account_amount, td.dest_account_icon, td.dest_account_color,
			COALESCE(ta.tags_json, '[]'::json) as tags_json
		FROM transaction_detail td
		LEFT JOIN tags_agg ta ON td.id = ta.transaction_id`

	queryStart := time.Now()
	err := tr.db.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		&templateID, &templateName, &templateAmount, &templateRecurrence, &templateStartDate, &templateEndDate,
		&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
		&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
		&tagsJSON,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionModel{}, huma.Error404NotFound("Transaction not found")
		}
		observability.RecordError("database")
		return models.TransactionModel{}, huma.Error500InternalServerError("Unable to query transaction", err)
	}
	observability.RecordQueryDuration("SELECT", "transactions", time.Since(queryStart).Seconds())

	item.Account = account
	item.Category = category

	if destAccountID != nil {
		destAccount = &models.TransactionAccountEmbedded{
			ID:        *destAccountID,
			Name:      *destAccountName,
			Type:      *destAccountType,
			Amount:    *destAccountAmount,
			Icon:      destAccountIcon,
			IconColor: destAccountColor,
		}
		item.DestinationAccount = destAccount
	}

	item.Tags = []models.TransactionTagEmbedded{}
	if len(tagsJSON) > 0 {
		if err := json.Unmarshal(tagsJSON, &item.Tags); err != nil {
			return models.TransactionModel{}, huma.Error500InternalServerError("Unable to parse tags data", err)
		}
	}

	if templateID != nil {
		item.Template = &models.TransactionTemplateEmbedded{
			ID:         *templateID,
			Name:       *templateName,
			Amount:     *templateAmount,
			Recurrence: *templateRecurrence,
			StartDate:  *templateStartDate,
			EndDate:    templateEndDate,
		}
	}

	return item, nil
}

func (tr TransactionRepository) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {
	var id int64

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id`

	queryStart := time.Now()
	err := tr.db.QueryRow(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note).Scan(&id)

	if err != nil {
		observability.RecordError("database")
		return models.TransactionModel{}, huma.Error500InternalServerError("Unable to create transaction", err)
	}
	observability.RecordQueryDuration("INSERT", "transactions", time.Since(queryStart).Seconds())

	return tr.GetDetail(ctx, id)
}

func (tr TransactionRepository) Update(ctx context.Context, id int64, p models.UpdateTransactionModel) (models.TransactionModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE transactions
			SET type = COALESCE($1, type),
				date = COALESCE($2, date),
				amount = COALESCE($3, amount),
				account_id = COALESCE($4, account_id),
				category_id = COALESCE($5, category_id),
				destination_account_id = COALESCE($6, destination_account_id),
				note = COALESCE($7, note),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $8 AND deleted_at IS NULL`

	queryStart := time.Now()
	cmdTag, err := tr.db.Exec(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note, id)

	if err != nil {
		observability.RecordError("database")
		return models.TransactionModel{}, huma.Error500InternalServerError("Unable to update transaction", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return models.TransactionModel{}, huma.Error404NotFound("Transaction not found")
	}
	observability.RecordQueryDuration("UPDATE", "transactions", time.Since(queryStart).Seconds())

	return tr.GetDetail(ctx, id)
}

func (tr TransactionRepository) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()
	sql := `UPDATE transactions
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	queryStart := time.Now()
	cmdTag, err := tr.db.Exec(ctx, sql, id)
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to delete transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction not found")
	}
	observability.RecordQueryDuration("DELETE", "transactions", time.Since(queryStart).Seconds())

	return nil
}

func (tr TransactionRepository) UpdateAccountBalance(ctx context.Context, accountID int64, deltaAmount int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE accounts
			SET amount = amount + $1
			WHERE id = $2 AND deleted_at IS NULL`

	cmdTag, err := tr.db.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return huma.Error500InternalServerError("Unable to update account balance", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Account not found")
	}

	return nil
}
