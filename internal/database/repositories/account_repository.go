package repositories

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schema"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AccountRepository struct {
	db *pgxpool.Pool
}

func NewAccountRepository(db *pgxpool.Pool) *AccountRepository {
	return &AccountRepository{db: db}
}

// List returns a paginated list of accounts based on search params.
func (r *AccountRepository) List(ctx context.Context, params schema.SearchParamAccountSchema) (schema.PaginatedAccountSchema, error) {
	var totalCount int
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM accounts").Scan(&totalCount); err != nil {
		return schema.PaginatedAccountSchema{}, fmt.Errorf("count accounts: %w", err)
	}

	sql := "SELECT id, name, type, note, amount, created_at, updated_at, deleted_at FROM accounts LIMIT $1 OFFSET $2"
	rows, err := r.db.Query(ctx, sql, params.PageSize, (params.PageNumber-1)*params.PageSize)
	if err != nil {
		return schema.PaginatedAccountSchema{}, fmt.Errorf("query accounts: %w", err)
	}
	defer rows.Close()

	pas := schema.PaginatedAccountSchema{}
	return pas.FromRows(rows, totalCount, params)
}

// Get returns a single account by id.
func (r *AccountRepository) Get(ctx context.Context, id int64) (schema.AccountSchema, error) {
	var account schema.AccountSchema
	sql := "SELECT id, name, type, note, amount, created_at, updated_at, deleted_at FROM accounts WHERE id = $1"
	if err := r.db.QueryRow(ctx, sql, id).Scan(&account.ID, &account.Name, &account.Type, &account.Note, &account.Amount, &account.CreatedAt, &account.UpdatedAt, &account.DeletedAt); err != nil {
		return schema.AccountSchema{}, fmt.Errorf("get account: %w", err)
	}
	return account, nil
}

// Create inserts a new account and returns the created record.
func (r *AccountRepository) Create(ctx context.Context, in schema.CreateAccountSchema) (schema.AccountSchema, error) {
	var account schema.AccountSchema
	sql := `INSERT INTO accounts (name, type, note, amount) VALUES ($1, $2, $3, $4) RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at`
	if err := r.db.QueryRow(ctx, sql, in.Name, in.Type, in.Note, in.Amount).Scan(&account.ID, &account.Name, &account.Type, &account.Note, &account.Amount, &account.CreatedAt, &account.UpdatedAt, &account.DeletedAt); err != nil {
		return schema.AccountSchema{}, fmt.Errorf("create account: %w", err)
	}
	return account, nil
}

// Update modifies an existing account and returns the updated record.
func (r *AccountRepository) Update(ctx context.Context, id int64, in schema.UpdateAccountSchema) (schema.AccountSchema, error) {
	var account schema.AccountSchema
	sql := `UPDATE accounts SET name = COALESCE($2, name), type = COALESCE($3, type), note = COALESCE($4, note), amount = COALESCE($5, amount), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, type, note, amount, created_at, updated_at, deleted_at`
	if err := r.db.QueryRow(ctx, sql, id, in.Name, in.Type, in.Note, in.Amount).Scan(&account.ID, &account.Name, &account.Type, &account.Note, &account.Amount, &account.CreatedAt, &account.UpdatedAt, &account.DeletedAt); err != nil {
		return schema.AccountSchema{}, fmt.Errorf("update account: %w", err)
	}
	return account, nil
}

// Delete performs a soft delete by setting deleted_at.
func (r *AccountRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`
	if _, err := r.db.Exec(ctx, sql, id); err != nil {
		return fmt.Errorf("delete account: %w", err)
	}
	return nil
}
