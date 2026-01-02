package repositories

import (
	"context"
	"errors"
	"fmt"

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

	// Count total items with filters
	whereClause, args := qb.ToWhereClause()
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM accounts %s", whereClause)
	var totalCount int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&totalCount); err != nil {
		return schemas.PaginatedAccountSchema{}, fmt.Errorf("count accounts: %w", err)
	}

	// Build ORDER BY clause and calculate pagination
	validColumns := map[string]string{
		"name":      "name",
		"type":      "type",
		"amount":    "amount",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)
	offset := (params.PageNumber - 1) * params.PageSize
	limitIdx := qb.NextArgIndex()

	// Query with pagination
	sql := fmt.Sprintf(`SELECT id, name, type, note, amount, created_at, updated_at, deleted_at 
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
	sql := `SELECT id, name, type, note, amount, created_at, updated_at, deleted_at 
	        FROM accounts 
	        WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.QueryRow(ctx, sql, id).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
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
func (r *AccountRepository) Create(ctx context.Context, in schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
	var account schemas.AccountSchema
	sql := `INSERT INTO accounts (name, type, note, amount) 
	        VALUES ($1, $2, $3, $4) 
	        RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, in.Name, in.Type, in.Note, in.Amount).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
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
// Returns ErrAccountNotFound if account doesn't exist or is soft deleted.
// Performance: Uses COALESCE for partial updates, RETURNING for single query.
func (r *AccountRepository) Update(ctx context.Context, id int64, in schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
	var account schemas.AccountSchema
	// Add deleted_at check to prevent updating soft-deleted records
	sql := `UPDATE accounts 
	        SET name = COALESCE($2, name), 
	            type = COALESCE($3, type), 
	            note = COALESCE($4, note), 
	            amount = COALESCE($5, amount), 
	            updated_at = CURRENT_TIMESTAMP 
	        WHERE id = $1 AND deleted_at IS NULL 
	        RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at`

	err := r.db.QueryRow(ctx, sql, id, in.Name, in.Type, in.Note, in.Amount).Scan(
		&account.ID,
		&account.Name,
		&account.Type,
		&account.Note,
		&account.Amount,
		&account.CreatedAt,
		&account.UpdatedAt,
		&account.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return schemas.AccountSchema{}, ErrAccountNotFound
		}
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
