package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
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
	// Build WHERE clause for filters
	where := "WHERE deleted_at IS NULL"
	args := []any{}
	argIndex := 1

	if params.Type != "" {
		where += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, params.Type)
		argIndex++
	}

	if params.AccountID > 0 {
		where += fmt.Sprintf(" AND account_id = $%d", argIndex)
		args = append(args, params.AccountID)
		argIndex++
	}

	if params.CategoryID > 0 {
		where += fmt.Sprintf(" AND category_id = $%d", argIndex)
		args = append(args, params.CategoryID)
		argIndex++
	}

	// Count total items
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM transactions %s", where)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("count transactions: %w", err)
	}

	// Build ORDER BY clause based on params
	orderBy := r.buildOrderByClause(params.OrderBy, params.OrderDirection)

	// Query with pagination
	offset := (params.Page - 1) * params.Limit
	sql := fmt.Sprintf(`SELECT id, type, date, amount, account_id, category_id, note, created_at, updated_at, deleted_at 
	        FROM transactions 
	        %s 
	        ORDER BY %s 
	        LIMIT $%d OFFSET $%d`, where, orderBy, argIndex, argIndex+1)

	args = append(args, params.Limit, offset)
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.Close()

	result := schemas.PaginatedTransactionSchema{
		Data:       []schemas.TransactionSchema{},
		Page:       params.Page,
		Limit:      params.Limit,
		TotalItems: totalCount,
		TotalPages: (totalCount + params.Limit - 1) / params.Limit,
	}

	if err := result.FromRows(rows); err != nil {
		return schemas.PaginatedTransactionSchema{}, fmt.Errorf("scan transactions: %w", err)
	}

	return result, nil
}

func (r *TransactionRepository) buildOrderByClause(orderBy, orderDirection string) string {
	validColumns := map[string]bool{
		"id":         true,
		"type":       true,
		"date":       true,
		"amount":     true,
		"created_at": true,
		"updated_at": true,
	}
	if !validColumns[orderBy] {
		orderBy = "created_at"
	}
	if orderDirection != "asc" && orderDirection != "desc" {
		orderDirection = "desc"
	}
	return fmt.Sprintf("%s %s", orderBy, orderDirection)
}

// Get retrieves a single transaction by ID.
// Returns ErrTransactionNotFound if not found or soft-deleted.
func (r *TransactionRepository) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
	sql := `SELECT id, type, date, amount, account_id, category_id, note, created_at, updated_at, deleted_at 
	        FROM transactions 
	        WHERE id = $1 AND deleted_at IS NULL`

	var transaction schemas.TransactionSchema
	err := r.db.QueryRow(ctx, sql, id).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
		&transaction.Note,
		&transaction.CreatedAt,
		&transaction.UpdatedAt,
		&transaction.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.TransactionSchema{}, ErrTransactionNotFound
		}
		return schemas.TransactionSchema{}, fmt.Errorf("get transaction: %w", err)
	}

	return transaction, nil
}

// Create inserts a new transaction and returns the created transaction using RETURNING.
func (r *TransactionRepository) Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error) {
	sql := `INSERT INTO transactions (type, date, amount, account_id, category_id, note) 
	        VALUES ($1, COALESCE($2, CURRENT_TIMESTAMP), $3, $4, $5, $6) 
	        RETURNING id, type, date, amount, account_id, category_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err := r.db.QueryRow(ctx, sql,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.Note,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
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
	            note = COALESCE($6, note),
	            updated_at = CURRENT_TIMESTAMP
	        WHERE id = $7 AND deleted_at IS NULL
	        RETURNING id, type, date, amount, account_id, category_id, note, created_at, updated_at, deleted_at`

	var transaction schemas.TransactionSchema
	err := r.db.QueryRow(ctx, sql,
		input.Type,
		input.Date,
		input.Amount,
		input.AccountID,
		input.CategoryID,
		input.Note,
		id,
	).Scan(
		&transaction.ID,
		&transaction.Type,
		&transaction.Date,
		&transaction.Amount,
		&transaction.AccountID,
		&transaction.CategoryID,
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
