package repositories

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionRepository struct {
	pgx *pgxpool.Pool
}

func NewTransactionRepository(pgx *pgxpool.Pool) TransactionRepository {
	return TransactionRepository{pgx}
}

func (tr TransactionRepository) List(ctx context.Context, p models.ListTransactionsRequestModel) (models.ListTransactionsResponseModel, error) {
	// Enforce page size limits
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 10
	}
	if p.PageNumber <= 0 {
		p.PageNumber = 1
	}

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

	sortColumn, ok := sortByMap[p.SortBy]
	if !ok {
		sortColumn = "t.date"
	}
	sortOrder, ok := sortOrderMap[p.SortOrder]
	if !ok {
		sortOrder = "DESC"
	}

	offset := (p.PageNumber - 1) * p.PageSize

	countSQL := `SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL`
	var totalCount int
	if err := tr.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListTransactionsResponseModel{}, huma.Error400BadRequest("Unable to count transactions", err)
	}

	sql := `SELECT t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
			a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
			c.id, c.name, c.type, c.icon, c.icon_color,
			da.id, da.name, da.type, da.amount, da.icon, da.icon_color
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.deleted_at IS NULL
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2`

	rows, err := tr.pgx.Query(ctx, sql, p.PageSize, offset)
	if err != nil {
		return models.ListTransactionsResponseModel{}, huma.Error400BadRequest("Unable to query transactions", err)
	}
	defer rows.Close()

	var items []models.TransactionModel
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

		err := rows.Scan(
			&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
			&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
			&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
			&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
		)
		if err != nil {
			return models.ListTransactionsResponseModel{}, huma.Error400BadRequest("Unable to scan transaction data", err)
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

		// TODO: Fetch tags for transaction from transaction_tags table

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListTransactionsResponseModel{}, huma.Error400BadRequest("Error reading transaction rows", err)
	}

	if items == nil {
		items = []models.TransactionModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + p.PageSize - 1) / p.PageSize
	}

	return models.ListTransactionsResponseModel{
		Data:       items,
		PageNumber: p.PageNumber,
		PageSize:   p.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (tr TransactionRepository) Get(ctx context.Context, id int64) (models.TransactionModel, error) {
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

	sql := `SELECT t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
			a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
			c.id, c.name, c.type, c.icon, c.icon_color,
			da.id, da.name, da.type, da.amount, da.icon, da.icon_color
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.id = $1 AND t.deleted_at IS NULL`

	err := tr.pgx.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
		&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
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

	// TODO: Fetch tags for transaction from transaction_tags table

	return item, nil
}

func (tr TransactionRepository) Create(ctx context.Context, p models.CreateTransactionRequestModel) (models.CreateTransactionResponseModel, error) {
	var item models.TransactionModel

	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, type, date, amount, note, created_at, updated_at, deleted_at`

	err := tr.pgx.QueryRow(ctx, sql, p.Type, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		return models.CreateTransactionResponseModel{}, huma.Error400BadRequest("Unable to create transaction", err)
	}

	// Fetch full transaction data with account and category
	return models.CreateTransactionResponseModel{TransactionModel: item}, nil
}

func (tr TransactionRepository) Update(ctx context.Context, id int64, p models.UpdateTransactionRequestModel) (models.UpdateTransactionResponseModel, error) {
	var item models.TransactionModel

	sql := `UPDATE transactions
			SET date = COALESCE($1, date),
				amount = COALESCE($2, amount),
				account_id = COALESCE($3, account_id),
				category_id = COALESCE($4, category_id),
				destination_account_id = COALESCE($5, destination_account_id),
				note = COALESCE($6, note),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $7 AND deleted_at IS NULL
			RETURNING id, type, date, amount, note, created_at, updated_at, deleted_at`

	err := tr.pgx.QueryRow(ctx, sql, p.Date, p.Amount, p.AccountID, p.CategoryID, p.DestinationAccountID, p.Note, id).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.UpdateTransactionResponseModel{}, huma.Error404NotFound("Transaction not found")
		}
		return models.UpdateTransactionResponseModel{}, huma.Error400BadRequest("Unable to update transaction", err)
	}

	return models.UpdateTransactionResponseModel{TransactionModel: item}, nil
}

func (tr TransactionRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE transactions
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := tr.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete transaction", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Transaction not found")
	}

	return nil
}

// UpdateAccountBalance updates an account's balance by delta amount
func (tr TransactionRepository) UpdateAccountBalance(ctx context.Context, accountID int64, deltaAmount int64) error {
	sql := `UPDATE accounts
			SET amount = amount + $1,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND deleted_at IS NULL`

	cmdTag, err := tr.pgx.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return huma.Error400BadRequest("Unable to update account balance", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Account not found")
	}

	return nil
}

// GetTransactionWithAccounts retrieves a full transaction with account and category details
func (tr TransactionRepository) GetTransactionWithAccounts(ctx context.Context, id int64) (models.TransactionModel, error) {
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

	sql := `SELECT t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
			a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
			c.id, c.name, c.type, c.icon, c.icon_color,
			da.id, da.name, da.type, da.amount, da.icon, da.icon_color
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN accounts da ON t.destination_account_id = da.id
			WHERE t.id = $1 AND t.deleted_at IS NULL`

	err := tr.pgx.QueryRow(ctx, sql, id).Scan(
		&item.ID, &item.Type, &item.Date, &item.Amount, &item.Note, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		&account.ID, &account.Name, &account.Type, &account.Amount, &account.Icon, &account.IconColor,
		&category.ID, &category.Name, &category.Type, &category.Icon, &category.IconColor,
		&destAccountID, &destAccountName, &destAccountType, &destAccountAmount, &destAccountIcon, &destAccountColor,
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

	return item, nil
}
