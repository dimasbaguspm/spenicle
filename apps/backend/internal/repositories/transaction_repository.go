package repositories

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionRepository struct {
	Pgx *pgxpool.Pool
}

func NewTransactionRepository(pgx *pgxpool.Pool) TransactionRepository {
	return TransactionRepository{Pgx: pgx}
}

func (tr TransactionRepository) GetPaged(ctx context.Context, p models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
	sortByMap := map[string]string{
		"id":        "t.id",
		"type":      "t.type",
		"date":      "t.date",
		"amount":    "t.amount",
		"createdAt": "t.created_at",
		"updatedAt": "t.updated_at",
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
				a.id as account_id, a.name as account_name, a.type as account_type, a.amount as account_amount, a.icon as account_icon, a.icon_color as account_color,
				c.id as category_id, c.name as category_name, c.type as category_type, c.icon as category_icon, c.icon_color as category_color,
				da.id as dest_account_id, da.name as dest_account_name, da.type as dest_account_type, da.amount as dest_account_amount, da.icon as dest_account_icon, da.icon_color as dest_account_color,
				COUNT(*) OVER() as total_count
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.deleted_at IS NULL
				AND (array_length($3::int8[], 1) IS NULL OR t.id = ANY($3::int8[]))
				AND (array_length($4::text[], 1) IS NULL OR t.type = ANY($4::text[]))
				AND (array_length($5::int8[], 1) IS NULL OR t.account_id = ANY($5::int8[]))
				AND (array_length($6::int8[], 1) IS NULL OR t.category_id = ANY($6::int8[]))
				AND (array_length($7::int8[], 1) IS NULL OR t.destination_account_id = ANY($7::int8[]) OR t.destination_account_id IS NULL)
				AND ($8::int8 IS NULL OR t.amount >= $8::int8)
				AND ($9::int8 IS NULL OR t.amount <= $9::int8)
				AND ($10::date IS NULL OR t.date >= $10::date)
				AND ($11::date IS NULL OR t.date <= $11::date)
				AND (array_length($12::int8[], 1) IS NULL OR t.id IN (
						SELECT DISTINCT tt.transaction_id
						FROM transaction_tags tt
						WHERE tt.tag_id = ANY($12::int8[])
					))
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
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
			ft.account_id, ft.account_name, ft.account_type, ft.account_amount, ft.account_icon, ft.account_color,
			ft.category_id, ft.category_name, ft.category_type, ft.category_icon, ft.category_color,
			ft.dest_account_id, ft.dest_account_name, ft.dest_account_type, ft.dest_account_amount, ft.dest_account_icon, ft.dest_account_color,
			COALESCE(ta.tags_json, '[]'::json) as tags_json,
			ft.total_count
		FROM filtered_transactions ft
		LEFT JOIN tags_agg ta ON ft.id = ta.transaction_id
	`

	var (
		ids            []int64
		types          []string
		accountIDs     []int64
		categoryIDs    []int64
		destAccountIDs []int64
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

	rows, err := tr.Pgx.Query(ctx, sql,
		p.PageSize, offset,
		ids, types, accountIDs, categoryIDs, destAccountIDs,
		minAmountParam, maxAmountParam,
		startDateParam, endDateParam,
		tagIDs,
	)
	if err != nil {
		return models.TransactionsPagedModel{}, huma.Error400BadRequest("Unable to query transactions", err)
	}
	defer rows.Close()

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

		err := rows.Scan(
			&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
			&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
			&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
			&tagsJSON,
			&totalCount,
		)
		if err != nil {
			return models.TransactionsPagedModel{}, huma.Error400BadRequest("Unable to scan transaction data", err)
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
				return models.TransactionsPagedModel{}, huma.Error400BadRequest("Unable to parse tags data", err)
			}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.TransactionsPagedModel{}, huma.Error400BadRequest("Error reading transaction rows", err)
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

	sql := `
		WITH transaction_detail AS (
			SELECT t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
				a.id as account_id, a.name as account_name, a.type as account_type, a.amount as account_amount, a.icon as account_icon, a.icon_color as account_color,
				c.id as category_id, c.name as category_name, c.type as category_type, c.icon as category_icon, c.icon_color as category_color,
				da.id as dest_account_id, da.name as dest_account_name, da.type as dest_account_type, da.amount as dest_account_amount, da.icon as dest_account_icon, da.icon_color as dest_account_color
			FROM transactions t
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
			td.account_id, td.account_name, td.account_type, td.account_amount, td.account_icon, td.account_color,
			td.category_id, td.category_name, td.category_type, td.category_icon, td.category_color,
			td.dest_account_id, td.dest_account_name, td.dest_account_type, td.dest_account_amount, td.dest_account_icon, td.dest_account_color,
			COALESCE(ta.tags_json, '[]'::json) as tags_json
		FROM transaction_detail td
		LEFT JOIN tags_agg ta ON td.id = ta.transaction_id`

	err := tr.Pgx.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
		&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
		&tagsJSON,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.TransactionModel{}, huma.Error404NotFound("Transaction not found")
		}
		return models.TransactionModel{}, huma.Error400BadRequest("Unable to query transaction", err)
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
			return models.TransactionModel{}, huma.Error400BadRequest("Unable to parse tags data", err)
		}
	}

	return item, nil
}

func (tr TransactionRepository) Create(ctx context.Context, p models.CreateTransactionModel) (models.TransactionModel, error) {
	var id int64

	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id`

	err := tr.Pgx.QueryRow(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note).Scan(&id)

	if err != nil {
		return models.TransactionModel{}, huma.Error400BadRequest("Unable to create transaction", err)
	}

	return tr.GetDetail(ctx, id)
}

func (tr TransactionRepository) CreateWithTx(ctx context.Context, tx pgx.Tx, p models.CreateTransactionModel) (int64, error) {
	var id int64

	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id`

	err := tx.QueryRow(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note).Scan(&id)

	if err != nil {
		return 0, huma.Error400BadRequest("Unable to create transaction", err)
	}

	return id, nil
}

func (tr TransactionRepository) Update(ctx context.Context, id int64, p models.UpdateTransactionModel) (models.TransactionModel, error) {
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

	cmdTag, err := tr.Pgx.Exec(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note, id)

	if err != nil {
		return models.TransactionModel{}, huma.Error400BadRequest("Unable to update transaction", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return models.TransactionModel{}, huma.Error404NotFound("Transaction not found")
	}

	return tr.GetDetail(ctx, id)
}

// UpdateWithTx updates a transaction within a provided database transaction
func (tr TransactionRepository) UpdateWithTx(ctx context.Context, tx pgx.Tx, id int64, p models.UpdateTransactionModel) error {
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

	cmdTag, err := tx.Exec(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note, id)

	if err != nil {
		return huma.Error400BadRequest("Unable to update transaction", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction not found")
	}

	return nil
}

func (tr TransactionRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE transactions
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := tr.Pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction not found")
	}

	return nil
}

// DeleteWithTx deletes a transaction within a provided database transaction
func (tr TransactionRepository) DeleteWithTx(ctx context.Context, tx pgx.Tx, id int64) error {
	sql := `UPDATE transactions
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := tx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction not found")
	}

	return nil
}

func (tr TransactionRepository) UpdateAccountBalance(ctx context.Context, accountID int64, deltaAmount int64) error {
	sql := `UPDATE accounts
			SET amount = amount + $1
			WHERE id = $2 AND deleted_at IS NULL`

	cmdTag, err := tr.Pgx.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return huma.Error400BadRequest("Unable to update account balance", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Account not found")
	}

	return nil
}
