package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type TransactionTemplateRepository struct {
	db DB
}

func NewTransactionTemplateRepository(db DB) *TransactionTemplateRepository {
	return &TransactionTemplateRepository{db: db}
}

var (
	ErrTransactionTemplateNotFound = errors.New("transaction template not found")
)

// List retrieves paginated transaction templates with filters
func (r *TransactionTemplateRepository) List(ctx context.Context, params schemas.SearchParamTransactionTemplateSchema) (*schemas.PaginatedTransactionTemplateSchema, error) {
	qb := utils.QueryBuilder()

	// Add filters
	if len(params.ID) > 0 {
		ids := make([]int, len(params.ID))
		for i, id := range params.ID {
			ids[i] = int(id)
		}
		qb.AddInFilter("id", ids)
	}
	if len(params.AccountID) > 0 {
		accountIDs := make([]int, len(params.AccountID))
		for i, id := range params.AccountID {
			accountIDs[i] = int(id)
		}
		qb.AddInFilter("account_id", accountIDs)
	}
	if len(params.CategoryID) > 0 {
		categoryIDs := make([]int, len(params.CategoryID))
		for i, id := range params.CategoryID {
			categoryIDs[i] = int(id)
		}
		qb.AddInFilter("category_id", categoryIDs)
	}
	if len(params.Type) > 0 {
		qb.AddInFilterString("type", params.Type)
	}
	if len(params.Recurrence) > 0 {
		qb.AddInFilterString("recurrence", params.Recurrence)
	}
	qb.Add("deleted_at IS NULL")

	whereClause, args := qb.ToWhereClause()

	// Build count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM transaction_templates %s", whereClause)

	var totalCount int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count transaction templates: %w", err)
	}

	if totalCount == 0 {
		return &schemas.PaginatedTransactionTemplateSchema{
			Items:      []schemas.TransactionTemplateSchema{},
			TotalCount: 0,
			PageNumber: params.Page,
			PageSize:   params.Limit,
			PageTotal:  0,
		}, nil
	}

	// Build paginated query
	offset := (params.Page - 1) * params.Limit
	dataQuery := fmt.Sprintf(`
		SELECT id, account_id, category_id, type, amount, description, recurrence,
		       start_date, end_date, installment_count, installment_current, note,
		       created_at, updated_at, deleted_at
		FROM transaction_templates
		%s
		ORDER BY created_at DESC
		LIMIT %d OFFSET %d`,
		whereClause, params.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query transaction templates: %w", err)
	}
	defer rows.Close()

	items, err := schemas.PaginatedTransactionTemplateSchema{}.FromRows(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan transaction templates: %w", err)
	}

	return &schemas.PaginatedTransactionTemplateSchema{
		Items:      items,
		TotalCount: totalCount,
		PageNumber: params.Page,
		PageSize:   params.Limit,
		PageTotal:  (totalCount + params.Limit - 1) / params.Limit,
	}, nil
}

// Get retrieves a single transaction template by ID (not deleted)
func (r *TransactionTemplateRepository) Get(ctx context.Context, id int) (*schemas.TransactionTemplateSchema, error) {
	query := `
		SELECT id, account_id, category_id, type, amount, description, recurrence,
		       start_date, end_date, installment_count, installment_current, note,
		       created_at, updated_at, deleted_at
		FROM transaction_templates
		WHERE id = $1 AND deleted_at IS NULL`

	var template schemas.TransactionTemplateSchema
	err := r.db.QueryRow(ctx, query, id).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.Type,
		&template.Amount,
		&template.Description,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.InstallmentCount,
		&template.InstallmentCurrent,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction template: %w", err)
	}

	return &template, nil
}

// Create creates a new transaction template
func (r *TransactionTemplateRepository) Create(ctx context.Context, input schemas.CreateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	query := `
		INSERT INTO transaction_templates (
			account_id, category_id, type, amount, description, recurrence,
			start_date, end_date, installment_count, note
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, account_id, category_id, type, amount, description, recurrence,
		          start_date, end_date, installment_count, installment_current, note,
		          created_at, updated_at, deleted_at`

	var template schemas.TransactionTemplateSchema
	err := r.db.QueryRow(
		ctx,
		query,
		input.AccountID,
		input.CategoryID,
		input.Type,
		input.Amount,
		input.Description,
		input.Recurrence,
		input.StartDate,
		input.EndDate,
		input.InstallmentCount,
		input.Note,
	).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.Type,
		&template.Amount,
		&template.Description,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.InstallmentCount,
		&template.InstallmentCurrent,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction template: %w", err)
	}

	return &template, nil
}

// Update updates an existing transaction template
func (r *TransactionTemplateRepository) Update(ctx context.Context, id int, input schemas.UpdateTransactionTemplateSchema) (*schemas.TransactionTemplateSchema, error) {
	qb := utils.QueryBuilder()
	updates := []string{}

	if input.AccountID != nil {
		updates = append(updates, fmt.Sprintf("account_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.AccountID)
	}
	if input.CategoryID != nil {
		updates = append(updates, fmt.Sprintf("category_id = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.CategoryID)
	}
	if input.Type != nil {
		updates = append(updates, fmt.Sprintf("type = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Type)
	}
	if input.Amount != nil {
		updates = append(updates, fmt.Sprintf("amount = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Amount)
	}
	if input.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Description)
	}
	if input.Recurrence != nil {
		updates = append(updates, fmt.Sprintf("recurrence = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Recurrence)
	}
	if input.StartDate != nil {
		updates = append(updates, fmt.Sprintf("start_date = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.StartDate)
	}
	if input.EndDate != nil {
		updates = append(updates, fmt.Sprintf("end_date = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.EndDate)
	}
	if input.InstallmentCount != nil {
		updates = append(updates, fmt.Sprintf("installment_count = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.InstallmentCount)
	}
	if input.Note != nil {
		updates = append(updates, fmt.Sprintf("note = $%d", qb.NextArgIndex()))
		qb.AddArg(*input.Note)
	}

	if len(updates) == 0 {
		return r.Get(ctx, id)
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", qb.NextArgIndex()))
	qb.AddArg(time.Now())

	query := fmt.Sprintf(`
		UPDATE transaction_templates
		SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, account_id, category_id, type, amount, description, recurrence,
		          start_date, end_date, installment_count, installment_current, note,
		          created_at, updated_at, deleted_at`,
		utils.JoinStrings(updates, ", "),
		qb.NextArgIndex(),
	)
	qb.AddArg(id)

	var template schemas.TransactionTemplateSchema
	err := r.db.QueryRow(ctx, query, qb.GetArgs()...).Scan(
		&template.ID,
		&template.AccountID,
		&template.CategoryID,
		&template.Type,
		&template.Amount,
		&template.Description,
		&template.Recurrence,
		&template.StartDate,
		&template.EndDate,
		&template.InstallmentCount,
		&template.InstallmentCurrent,
		&template.Note,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction template: %w", err)
	}

	return &template, nil
}

// Delete soft deletes a transaction template
func (r *TransactionTemplateRepository) Delete(ctx context.Context, id int) error {
	query := `
		UPDATE transaction_templates
		SET deleted_at = $1, updated_at = $1
		WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.db.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to delete transaction template: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return nil // Already deleted or not found
	}

	return nil
}

// GetActiveTemplates retrieves templates that should generate transactions
// Used by worker to create recurring transactions
func (r *TransactionTemplateRepository) GetActiveTemplates(ctx context.Context) ([]schemas.TransactionTemplateSchema, error) {
	query := `
		SELECT id, account_id, category_id, type, amount, description, recurrence,
		       start_date, end_date, installment_count, installment_current, note,
		       created_at, updated_at, deleted_at
		FROM transaction_templates
		WHERE deleted_at IS NULL
		  AND recurrence != 'none'
		  AND start_date <= $1
		  AND (end_date IS NULL OR end_date >= $1)
		  AND (installment_count IS NULL OR installment_current < installment_count)
		ORDER BY id`

	rows, err := r.db.Query(ctx, query, time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to query active templates: %w", err)
	}
	defer rows.Close()

	items, err := schemas.PaginatedTransactionTemplateSchema{}.FromRows(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan active templates: %w", err)
	}

	return items, nil
}

// IncrementInstallment increments the installment_current counter
func (r *TransactionTemplateRepository) IncrementInstallment(ctx context.Context, id int) error {
	query := `
		UPDATE transaction_templates
		SET installment_current = installment_current + 1,
		    updated_at = $1
		WHERE id = $2 AND deleted_at IS NULL`

	_, err := r.db.Exec(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to increment installment: %w", err)
	}

	return nil
}
