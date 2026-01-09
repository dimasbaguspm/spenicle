package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
	"github.com/jackc/pgx/v5"
)

var (
	ErrTransactionNotFound             = errors.New("transaction not found")
	ErrInvalidTransactionData          = errors.New("invalid transaction data")
	ErrTransactionTypeCategoryMismatch = errors.New("transaction type must match category type")
	ErrInvalidAccountTypeForExpense    = errors.New("expense transactions can only use expense or income account types")
	TransactionExpenseType             = "expense"
	TransactionIncomeType              = "income"
	TransactionTransferType            = "transfer"
)

type TransactionRepository struct {
	db DB
}

func NewTransactionRepository(db DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// List returns a paginated list of transactions based on search params.
// Only returns non-deleted transactions (soft delete filter).
func (r *TransactionRepository) List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error) {
	qb := utils.QueryBuilder()
	qb.Add("t.deleted_at IS NULL")
	qb.AddInFilter("t.id", params.ID)
	qb.AddInFilterString("t.type", params.Type)
	qb.AddInFilter("t.account_id", params.AccountIDs)
	qb.AddInFilter("t.category_id", params.CategoryIDs)
	qb.AddInFilter("t.destination_account_id", params.DestinationAccountIDs)

	// Add tag filter - transactions must have at least one of the specified tags
	if len(params.TagIDs) > 0 {
		placeholders := make([]string, len(params.TagIDs))
		for i, tagID := range params.TagIDs {
			idx := qb.AddArg(tagID)
			placeholders[i] = fmt.Sprintf("$%d", idx)
		}
		qb.Add(fmt.Sprintf("t.id IN (SELECT transaction_id FROM transaction_tags WHERE tag_id IN (%s))", strings.Join(placeholders, ",")))
	}

	// Add date range filters
	if params.StartDate != "" {
		idx := qb.AddArg(params.StartDate)
		qb.Add(fmt.Sprintf("t.date >= $%d", idx))
	}
	if params.EndDate != "" {
		idx := qb.AddArg(params.EndDate)
		qb.Add(fmt.Sprintf("t.date <= $%d", idx))
	}

	// Add amount range filters (0 means not set)
	if params.MinAmount > 0 {
		idx := qb.AddArg(params.MinAmount)
		qb.Add(fmt.Sprintf("t.amount >= $%d", idx))
	}
	if params.MaxAmount > 0 {
		idx := qb.AddArg(params.MaxAmount)
		qb.Add(fmt.Sprintf("t.amount <= $%d", idx))
	}

	// Count total items with filters
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM transactions t %s", whereClause)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("count transactions: %w", err)
	}

	// Build ORDER BY clause and calculate pagination
	validColumns := map[string]string{
		"id":        "t.id",
		"type":      "t.type",
		"date":      "t.date",
		"amount":    "t.amount",
		"createdAt": "t.created_at",
		"updatedAt": "t.updated_at",
	}
	orderBy := qb.BuildOrderBy(params.SortBy, params.SortOrder, validColumns)
	offset := (params.PageNumber - 1) * params.PageSize
	limitIdx := qb.NextArgIndex()

	// Query with pagination - JOIN with accounts and categories to get embedded data
	sql := fmt.Sprintf(`SELECT 
		t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
		-- Account info
		a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
		-- Category info
		c.id, c.name, c.type, c.icon, c.icon_color,
		-- Destination account info (nullable)
		da.id, da.name, da.type, da.amount, da.icon, da.icon_color,
		-- Tags info (array of JSON objects)
		COALESCE(
			(SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name))
			FROM transaction_tags tt
			JOIN tags tg ON tt.tag_id = tg.id
			WHERE tt.transaction_id = t.id), '[]'::json
		) as tags
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id AND a.deleted_at IS NULL
		JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL
		LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.deleted_at IS NULL
	        %s 
	        %s 
	        LIMIT $%d OFFSET $%d`, whereClause, orderBy, limitIdx, limitIdx+1)

	args = append(args, params.PageSize, offset)
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.Close()

	result := schemas.PaginatedTransactionSchema{
		Items:      []schemas.TransactionSchema{},
		PageNumber: params.PageNumber,
		PageSize:   params.PageSize,
		TotalCount: totalCount,
		PageTotal:  (totalCount + params.PageSize - 1) / params.PageSize,
	}

	if err := result.FromRows(rows); err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("scan transactions: %w", err)
	}

	return result, nil
}

// Get retrieves a single transaction by ID with embedded account, category, and tags data.
// Returns ErrTransactionNotFound if not found or soft-deleted.
func (r *TransactionRepository) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
	sql := `SELECT 
		t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
		-- Account info
		a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
		-- Category info
		c.id, c.name, c.type, c.icon, c.icon_color,
		-- Destination account info (nullable)
		da.id, da.name, da.type, da.amount, da.icon, da.icon_color,
		-- Tags info (array of JSON objects)
		COALESCE(
			(SELECT JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name))
			FROM transaction_tags tt
			JOIN tags tg ON tt.tag_id = tg.id
			WHERE tt.transaction_id = t.id), '[]'::json
		) as tags
		FROM transactions t
		JOIN accounts a ON t.account_id = a.id AND a.deleted_at IS NULL
		JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL
		LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.deleted_at IS NULL
		WHERE t.id = $1 AND t.deleted_at IS NULL`

	var transaction schemas.TransactionSchema
	var destAccountID, destAccountAmount *int64
	var destAccountName, destAccountType, destAccountIcon, destAccountIconColor *string
	var tagsJSON []byte

	err := r.db.QueryRow(ctx, sql, id).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
		// Account
		&transaction.Account.ID,
		&transaction.Account.Name,
		&transaction.Account.Type,
		&transaction.Account.Amount,
		&transaction.Account.Icon,
		&transaction.Account.IconColor,
		// Category
		&transaction.Category.ID,
		&transaction.Category.Name,
		&transaction.Category.Type,
		&transaction.Category.Icon,
		&transaction.Category.IconColor,
		// Destination Account (nullable)
		&destAccountID,
		&destAccountName,
		&destAccountType,
		&destAccountAmount,
		&destAccountIcon,
		&destAccountIconColor,
		// Tags (JSON array)
		&tagsJSON,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.TransactionSchema{}, ErrTransactionNotFound
		}
		return schemas.TransactionSchema{}, fmt.Errorf("get transaction: %w", err)
	}

	// Populate internal ID fields for DB operations
	transaction.AccountID = int(transaction.Account.ID)
	transaction.CategoryID = int(transaction.Category.ID)

	// Populate destination account if present
	if destAccountID != nil {
		destAccID := int(*destAccountID)
		transaction.DestinationAccountID = &destAccID
		transaction.DestinationAccount = &schemas.TransactionAccountSchema{
			ID:        *destAccountID,
			Name:      *destAccountName,
			Type:      *destAccountType,
			Amount:    *destAccountAmount,
			Icon:      destAccountIcon,
			IconColor: destAccountIconColor,
		}
	}

	// Unmarshal tags JSON
	if len(tagsJSON) > 0 {
		if err := json.Unmarshal(tagsJSON, &transaction.Tags); err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("unmarshal tags: %w", err)
		}
	}
	if transaction.Tags == nil {
		transaction.Tags = []schemas.TransactionTagSchema{}
	}

	return transaction, nil
}

// Create inserts a new transaction and returns the created transaction using RETURNING.
func (r *TransactionRepository) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note) 
	        VALUES ($1, COALESCE($2, CURRENT_TIMESTAMP), $3, $4, $5, $6, $7) 
	        RETURNING id, type, date, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err := r.db.QueryRow(ctx, sql,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.DestinationAccountID,
		input.Note,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
		&transaction.DestinationAccountID,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
	)

	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("create transaction: %w", err)
	}

	return transaction, nil
}

// Update applies partial updates to a transaction using COALESCE pattern.
// Returns ErrTransactionNotFound if not found or soft-deleted.
func (r *TransactionRepository) Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error) {
	sql := `UPDATE transactions 
	        SET type = COALESCE($1, type),
	            date = COALESCE($2, date),
	            amount = COALESCE($3, amount),
	            account_id = COALESCE($4, account_id),
	            category_id = COALESCE($5, category_id),
	            destination_account_id = COALESCE($6, destination_account_id),
	            note = COALESCE($7, note),
	            updated_at = CURRENT_TIMESTAMP
	        WHERE id = $8 AND deleted_at IS NULL
	        RETURNING id, type, date, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err := r.db.QueryRow(ctx, sql,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.DestinationAccountID,
		input.Note,
		id,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
		&transaction.DestinationAccountID,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.TransactionSchema{}, ErrTransactionNotFound
		}
		return schemas.TransactionSchema{}, fmt.Errorf("update transaction: %w", err)
	}

	return transaction, nil
}

// Delete performs a soft delete by setting deleted_at timestamp.
// Returns ErrTransactionNotFound if not found or already deleted.
func (r *TransactionRepository) Delete(ctx context.Context, id int) error {
	sql := `UPDATE transactions 
	        SET deleted_at = CURRENT_TIMESTAMP 
	        WHERE id = $1 AND deleted_at IS NULL`

	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("delete transaction: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrTransactionNotFound
	}

	return nil
}

// UpdateAccountBalance updates the account balance (for syncing when transaction changes).
// This is a helper method for the service layer to maintain account balance consistency.
func (r *TransactionRepository) UpdateAccountBalance(ctx context.Context, accountID int, deltaAmount int) error {
	sql := `UPDATE accounts 
	        SET amount = amount + $1,
	            updated_at = CURRENT_TIMESTAMP
	        WHERE id = $2 AND deleted_at IS NULL`

	tag, err := r.db.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return fmt.Errorf("update account balance: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return errors.New(ErrAccountNotFound.Error())
	}

	return nil
}

// CreateTransfer creates a transfer transaction and updates both account balances atomically.
// This method wraps the entire operation in a database transaction to ensure consistency.
// If any step fails, all changes are rolled back.
func (r *TransactionRepository) CreateTransfer(ctx context.Context, input schemas.CreateTransactionSchema, sourceAccountID, destinationAccountID int) (schemas.TransactionSchema, error) {
	// Begin database transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) // Rollback if not committed

	// Create the transfer transaction record
	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, destination_account_id, note) 
	        VALUES ($1, COALESCE($2, CURRENT_TIMESTAMP), $3, $4, $5, $6, $7) 
	        RETURNING id, type, date, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err = tx.QueryRow(ctx, sql,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.DestinationAccountID,
		input.Note,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
		&transaction.DestinationAccountID,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
	)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("create transfer transaction: %w", err)
	}

	// Deduct from source account
	deductSQL := `UPDATE accounts 
	              SET amount = amount - $1,
	                  updated_at = CURRENT_TIMESTAMP
	              WHERE id = $2 AND deleted_at IS NULL`

	tag, err := tx.Exec(ctx, deductSQL, input.Amount, sourceAccountID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("update source account balance: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return schemas.TransactionSchema{}, errors.New("source account not found")
	}

	// Add to destination account
	addSQL := `UPDATE accounts 
	           SET amount = amount + $1,
	               updated_at = CURRENT_TIMESTAMP
	           WHERE id = $2 AND deleted_at IS NULL`

	tag, err = tx.Exec(ctx, addSQL, input.Amount, destinationAccountID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("update destination account balance: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return schemas.TransactionSchema{}, errors.New("destination account not found")
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("commit transaction: %w", err)
	}

	return transaction, nil
}

// UpdateTransfer updates a transfer transaction and adjusts both account balances atomically.
// This reverts the old transfer effects and applies the new ones in a single database transaction.
func (r *TransactionRepository) UpdateTransfer(ctx context.Context, id int, oldTransaction schemas.TransactionSchema, input schemas.UpdateTransactionSchema, newSourceAccountID, newDestinationAccountID int) (schemas.TransactionSchema, error) {
	// Begin database transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update the transaction record
	updateTxSQL := `UPDATE transactions 
	                SET type = COALESCE($1, type),
	                    date = COALESCE($2, date),
	                    amount = COALESCE($3, amount),
	                    account_id = COALESCE($4, account_id),
	                    category_id = COALESCE($5, category_id),
	                    destination_account_id = COALESCE($6, destination_account_id),
	                    note = COALESCE($7, note),
	                    updated_at = CURRENT_TIMESTAMP
	                WHERE id = $8 AND deleted_at IS NULL
	                RETURNING id, type, date, amount, account_id, category_id, destination_account_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err = tx.QueryRow(ctx, updateTxSQL,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.DestinationAccountID,
		input.Note,
		id,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
		&transaction.DestinationAccountID,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.TransactionSchema{}, ErrTransactionNotFound
		}
		return schemas.TransactionSchema{}, fmt.Errorf("update transfer transaction: %w", err)
	}

	// Revert old transfer effects
	// Add back to old source account
	updateAccSQL := `UPDATE accounts 
	                 SET amount = amount + $1,
	                     updated_at = CURRENT_TIMESTAMP
	                 WHERE id = $2 AND deleted_at IS NULL`
	_, err = tx.Exec(ctx, updateAccSQL, oldTransaction.Amount, oldTransaction.AccountID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("revert old source account: %w", err)
	}

	// Deduct from old destination account
	updateAccSQL = `UPDATE accounts 
	                SET amount = amount - $1,
	                    updated_at = CURRENT_TIMESTAMP
	                WHERE id = $2 AND deleted_at IS NULL`
	if oldTransaction.DestinationAccountID != nil {
		_, err = tx.Exec(ctx, updateAccSQL, oldTransaction.Amount, *oldTransaction.DestinationAccountID)
		if err != nil {
			return schemas.TransactionSchema{}, fmt.Errorf("revert old destination account: %w", err)
		}
	}

	// Apply new transfer effects
	// Deduct from new source account
	_, err = tx.Exec(ctx, updateAccSQL, transaction.Amount, newSourceAccountID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("update new source account: %w", err)
	}

	// Add to new destination account
	updateAccSQL = `UPDATE accounts 
	                SET amount = amount + $1,
	                    updated_at = CURRENT_TIMESTAMP
	                WHERE id = $2 AND deleted_at IS NULL`
	_, err = tx.Exec(ctx, updateAccSQL, transaction.Amount, newDestinationAccountID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("update new destination account: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("commit transaction: %w", err)
	}

	return transaction, nil
}

// DeleteTransfer deletes a transfer transaction and reverts both account balances atomically.
func (r *TransactionRepository) DeleteTransfer(ctx context.Context, transaction schemas.TransactionSchema) error {
	// Begin database transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Soft delete the transaction
	deleteTxSQL := `UPDATE transactions 
	                SET deleted_at = CURRENT_TIMESTAMP 
	                WHERE id = $1 AND deleted_at IS NULL`

	tag, err := tx.Exec(ctx, deleteTxSQL, transaction.ID)
	if err != nil {
		return fmt.Errorf("delete transfer transaction: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTransactionNotFound
	}

	// Revert source account (add back the amount)
	updateAccSQL := `UPDATE accounts 
	                 SET amount = amount + $1,
	                     updated_at = CURRENT_TIMESTAMP
	                 WHERE id = $2 AND deleted_at IS NULL`

	_, err = tx.Exec(ctx, updateAccSQL, transaction.Amount, transaction.AccountID)
	if err != nil {
		return fmt.Errorf("revert source account balance: %w", err)
	}

	// Revert destination account (deduct the amount)
	if transaction.DestinationAccountID != nil {
		updateAccSQL = `UPDATE accounts 
		                SET amount = amount - $1,
		                    updated_at = CURRENT_TIMESTAMP
		                WHERE id = $2 AND deleted_at IS NULL`

		_, err = tx.Exec(ctx, updateAccSQL, transaction.Amount, *transaction.DestinationAccountID)
		if err != nil {
			return fmt.Errorf("revert destination account balance: %w", err)
		}
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
