package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DB is a subset of the pgx pool API used by the repository. It is
// implemented by *pgxpool.Pool in production and by pgxmock in tests.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Begin(ctx context.Context) (pgx.Tx, error)
}

var (
	ErrAccountNotFound    = errors.New("account not found")
	ErrNoFieldsToUpdate   = errors.New("at least one field must be provided to update")
	ErrInvalidAccountData = errors.New("invalid account data")

	AccountExpenseType = "expense"
	AccountIncomeType  = "income"
)

type AccountRepository struct {
	db DB
}

func NewAccountRepository(db DB) *AccountRepository {
	return &AccountRepository{db: db}
}

// List returns a paginated list of accounts based on search params.
// Only returns non-deleted accounts (soft delete filter).
func (r *AccountRepository) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
	// Build query filters using queryBuilder for cleaner code
	qb := utils.QueryBuilder()
	qb.Add("deleted_at IS NULL")
	qb.AddInFilter("id", params.ID)
	qb.AddLikeFilter("name", params.Name)
	qb.AddInFilterString("type", params.Type)

	// Add archived filter
	if params.Archived != "" {
		if params.Archived == "true" {
			qb.Add("archived_at IS NOT NULL")
		} else if params.Archived == "false" {
			qb.Add("archived_at IS NULL")
		}
	}

	// Count total items with filters
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM accounts %s", whereClause)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedAccountSchema{}, fmt.Errorf("count accounts: %w", err)
	}

	// Build ORDER BY clause and calculate pagination
	validColumns := map[string]string{
		"name":         "name",
		"type":         "type",
		"amount":       "amount",
		"displayOrder": "display_order",
		"createdAt":    "created_at",
		"updatedAt":    "updated_at",
	}
	orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)
	offset := (params.PageNumber - 1) * params.PageSize
	limitIdx := qb.NextArgIndex()

	// Query with pagination
	sql := fmt.Sprintf(`SELECT id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at 
	        FROM accounts 
	        %s 
	        %s
	        LIMIT $%d OFFSET $%d`, whereClause, orderBy, limitIdx, limitIdx+1)

	args = append(args, params.PageSize, offset)
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.PaginatedAccountSchema{}, fmt.Errorf("query accounts: %w", err)
	}
	defer rows.Close()

	pas := schemas.PaginatedAccountSchema{}
	return pas.FromRows(rows, totalCount, params)
}

// Get returns a single account by id.
// Returns ErrAccountNotFound if account doesn't exist or is soft deleted.
func (r *AccountRepository) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
	var account schemas.AccountSchema
	// Performance: Add WHERE clause for soft delete filter (allows index usage)
	sql := `SELECT id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at 
	        FROM accounts 
	        WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.QueryRow(ctx, sql, id).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
		&account.Icon,
		&account.IconColor,
		&account.DisplayOrder,
		&account.ArchivedAt,
		&account.CreatedAt,
		&account.UpdatedAt,
		&account.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.AccountSchema{}, ErrAccountNotFound
		}
		return schemas.AccountSchema{}, fmt.Errorf("get account: %w", err)
	}

	return account, nil
}

// Create inserts a new account and returns the created record.
// Performance: Uses RETURNING to fetch created record in single query.
// Auto-calculates display_order as max(display_order) + 1.
func (r *AccountRepository) Create(ctx context.Context, in schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	var account schemas.AccountSchema
	sql := `INSERT INTO accounts (name, type, note, amount, icon, icon_color, display_order) 
	        VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(display_order) + 1 FROM accounts), 0)) 
	        RETURNING id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, in.Name, in.Type, in.Note, in.Amount, in.Icon, in.IconColor).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
		&account.Icon,
		&account.IconColor,
		&account.DisplayOrder,
		&account.ArchivedAt,
		&account.CreatedAt,
		&account.UpdatedAt,
		&account.DeletedAt,
	)

	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("create account: %w", err)
	}

	return account, nil
}

// Update modifies an existing account and returns the updated record.
// Dynamically builds UPDATE clause for only the fields provided.
// Returns ErrAccountNotFound if account doesn't exist or is soft deleted.
func (r *AccountRepository) Update(ctx context.Context, id int64, in schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	// Performance: Verify account exists before trying to update
	var exists bool
	checkSQL := "SELECT EXISTS(SELECT 1 FROM accounts WHERE id = $1 AND deleted_at IS NULL)"
	if err := r.db.QueryRow(ctx, checkSQL, id).Scan(&exists); err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("check account existence: %w", err)
	}
	if !exists {
		return schemas.AccountSchema{}, ErrAccountNotFound
	}

	// Build dynamic UPDATE clause for provided fields only
	var setClauses []string
	var args []any
	args = append(args, id) // $1 is always id
	paramIdx := 2           // Start from $2

	if in.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", paramIdx))
		args = append(args, *in.Name)
		paramIdx++
	}
	if in.Type != nil {
		setClauses = append(setClauses, fmt.Sprintf("type = $%d", paramIdx))
		args = append(args, *in.Type)
		paramIdx++
	}
	if in.Note != nil {
		setClauses = append(setClauses, fmt.Sprintf("note = $%d", paramIdx))
		args = append(args, *in.Note)
		paramIdx++
	}
	if in.Amount != nil {
		setClauses = append(setClauses, fmt.Sprintf("amount = $%d", paramIdx))
		args = append(args, *in.Amount)
		paramIdx++
	}
	if in.Icon != nil {
		setClauses = append(setClauses, fmt.Sprintf("icon = $%d", paramIdx))
		args = append(args, *in.Icon)
		paramIdx++
	}
	if in.IconColor != nil {
		setClauses = append(setClauses, fmt.Sprintf("icon_color = $%d", paramIdx))
		args = append(args, *in.IconColor)
		paramIdx++
	}
	if in.ArchivedAt != nil {
		if *in.ArchivedAt == "null" {
			setClauses = append(setClauses, "archived_at = NULL")
		} else {
			setClauses = append(setClauses, fmt.Sprintf("archived_at = $%d", paramIdx))
			args = append(args, time.Now())
			paramIdx++
		}
	}

	// Always update updated_at
	setClauses = append(setClauses, "updated_at = NOW()")

	sql := fmt.Sprintf(`UPDATE accounts 
	        SET %s
	        WHERE id = $1 AND deleted_at IS NULL
	        RETURNING id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`,
		strings.Join(setClauses, ", "))

	var account schemas.AccountSchema
	err := r.db.QueryRow(ctx, sql, args...).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
		&account.Icon,
		&account.IconColor,
		&account.DisplayOrder,
		&account.ArchivedAt,
		&account.CreatedAt,
		&account.UpdatedAt,
		&account.DeletedAt,
	)

	if err != nil {
		return schemas.AccountSchema{}, fmt.Errorf("update account: %w", err)
	}

	return account, nil
}

// Delete performs a soft delete by setting deleted_at.
// Returns ErrAccountNotFound if account doesn't exist or is already deleted.
// Performance: Prevents deleting already deleted records.
func (r *AccountRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE accounts 
	        SET deleted_at = CURRENT_TIMESTAMP 
	        WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("delete account: %w", err)
	}

	// Check if any row was affected
	if result.RowsAffected() == 0 {
		return ErrAccountNotFound
	}

	return nil
}

// Reorder atomically updates display_order for multiple accounts.
// Uses a single SQL statement with CASE expression for atomic batch update.
// Only updates non-deleted accounts.
func (r *AccountRepository) Reorder(ctx context.Context, items []schemas.AccountReorderItemSchema) error {
	if len(items) == 0 {
		return nil
	}

	// Build CASE expression for each item
	var caseExprs []string
	var ids []int64
	for _, item := range items {
		caseExprs = append(caseExprs, fmt.Sprintf("WHEN id = %d THEN %d", item.ID, item.DisplayOrder))
		ids = append(ids, item.ID)
	}

	// Build the full SQL statement
	// Using a single UPDATE with CASE ensures atomicity
	sql := fmt.Sprintf(`UPDATE accounts 
		SET display_order = CASE %s END,
		    updated_at = NOW()
		WHERE id IN (%s) AND deleted_at IS NULL`,
		strings.Join(caseExprs, " "),
		joinInt64(ids, ","))

	_, err := r.db.Exec(ctx, sql)
	if err != nil {
		return fmt.Errorf("reorder accounts: %w", err)
	}

	return nil
}

// joinInt64 joins int64 slice into a comma-separated string.
// Used for building SQL IN clauses.
func joinInt64(ids []int64, sep string) string {
	strIds := make([]string, len(ids))
	for i, id := range ids {
		strIds[i] = fmt.Sprintf("%d", id)
	}
	return strings.Join(strIds, sep)
}
