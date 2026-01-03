package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type TransactionTagRepository struct {
	db DB
}

func NewTransactionTagRepository(db DB) *TransactionTagRepository {
	return &TransactionTagRepository{db: db}
}

// GetTransactionTags returns all tags for a specific transaction
func (r *TransactionTagRepository) GetTransactionTags(ctx context.Context, transactionID int) ([]schemas.TagSchema, error) {
	sql := `
		SELECT t.id, t.name, t.created_at
		FROM tags t
		INNER JOIN transaction_tags tt ON t.id = tt.tag_id
		WHERE tt.transaction_id = $1
		ORDER BY t.name ASC
	`

	rows, err := r.db.Query(ctx, sql, transactionID)
	if err != nil {
		return nil, fmt.Errorf("get transaction tags: %w", err)
	}
	defer rows.Close()

	var tags []schemas.TagSchema
	for rows.Next() {
		var tag schemas.TagSchema
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	if tags == nil {
		tags = []schemas.TagSchema{}
	}

	return tags, nil
}

// AddTagToTransaction adds a tag to a transaction (idempotent)
func (r *TransactionTagRepository) AddTagToTransaction(ctx context.Context, transactionID int, tagID int) error {
	sql := `
		INSERT INTO transaction_tags (transaction_id, tag_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (transaction_id, tag_id) DO NOTHING
	`

	_, err := r.db.Exec(ctx, sql, transactionID, tagID)
	if err != nil {
		return fmt.Errorf("add tag to transaction: %w", err)
	}

	return nil
}

// RemoveTagFromTransaction removes a tag from a transaction
func (r *TransactionTagRepository) RemoveTagFromTransaction(ctx context.Context, transactionID int, tagID int) error {
	sql := `DELETE FROM transaction_tags WHERE transaction_id = $1 AND tag_id = $2`

	_, err := r.db.Exec(ctx, sql, transactionID, tagID)
	if err != nil {
		return fmt.Errorf("remove tag from transaction: %w", err)
	}

	return nil
}

// ReplaceTransactionTags replaces all tags for a transaction
func (r *TransactionTagRepository) ReplaceTransactionTags(ctx context.Context, transactionID int, tagIDs []int) error {
	// Delete existing tags
	deleteSql := `DELETE FROM transaction_tags WHERE transaction_id = $1`
	if _, err := r.db.Exec(ctx, deleteSql, transactionID); err != nil {
		return fmt.Errorf("delete existing tags: %w", err)
	}

	// If no tags to add, we're done
	if len(tagIDs) == 0 {
		return nil
	}

	// Build bulk insert
	valueStrings := make([]string, 0, len(tagIDs))
	valueArgs := make([]interface{}, 0, len(tagIDs)*2)
	argPosition := 1

	for _, tagID := range tagIDs {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, NOW())", argPosition, argPosition+1))
		valueArgs = append(valueArgs, transactionID, tagID)
		argPosition += 2
	}

	insertSql := fmt.Sprintf(
		"INSERT INTO transaction_tags (transaction_id, tag_id, created_at) VALUES %s",
		strings.Join(valueStrings, ","),
	)

	if _, err := r.db.Exec(ctx, insertSql, valueArgs...); err != nil {
		return fmt.Errorf("insert new tags: %w", err)
	}

	return nil
}

// GetTagSummary returns summary statistics grouped by tags
func (r *TransactionTagRepository) GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error) {
	qb := utils.QueryBuilder()

	// Apply filters using query builder
	if !params.StartDate.IsZero() {
		idx := qb.AddArg(params.StartDate)
		qb.Add(fmt.Sprintf("tr.date >= $%d", idx))
	}

	if !params.EndDate.IsZero() {
		idx := qb.AddArg(params.EndDate)
		qb.Add(fmt.Sprintf("tr.date <= $%d", idx))
	}

	if len(params.TagNames) > 0 {
		placeholders := qb.BuildPlaceholders(len(params.TagNames))
		for _, name := range params.TagNames {
			qb.AddArg(name)
		}
		qb.Add(fmt.Sprintf("t.name IN (%s)", placeholders))
	}

	if len(params.AccountIDs) > 0 {
		placeholders := qb.BuildPlaceholders(len(params.AccountIDs))
		for _, id := range params.AccountIDs {
			qb.AddArg(id)
		}
		qb.Add(fmt.Sprintf("tr.account_id IN (%s)", placeholders))
	}

	if len(params.CategoryIDs) > 0 {
		placeholders := qb.BuildPlaceholders(len(params.CategoryIDs))
		for _, id := range params.CategoryIDs {
			qb.AddArg(id)
		}
		qb.Add(fmt.Sprintf("tr.category_id IN (%s)", placeholders))
	}

	if params.Type != "" {
		idx := qb.AddArg(params.Type)
		qb.Add(fmt.Sprintf("tr.type = $%d", idx))
	}

	// Build WHERE clause
	whereClause, args := qb.ToWhereClause()
	if whereClause == "" {
		whereClause = "WHERE tr.deleted_at IS NULL"
	} else {
		whereClause = "WHERE tr.deleted_at IS NULL AND " + strings.TrimPrefix(whereClause, "WHERE ")
	}

	// Build full SQL query
	sql := fmt.Sprintf(`
		SELECT 
			t.id as tag_id,
			t.name as tag_name,
			COUNT(*) as total_count,
			COUNT(*) FILTER (WHERE tr.type = 'income') as income_count,
			COUNT(*) FILTER (WHERE tr.type = 'expense') as expense_count,
			COUNT(*) FILTER (WHERE tr.type = 'transfer') as transfer_count,
			COALESCE(SUM(tr.amount) FILTER (WHERE tr.type = 'income'), 0) as income_amount,
			COALESCE(SUM(tr.amount) FILTER (WHERE tr.type = 'expense'), 0) as expense_amount,
			COALESCE(SUM(tr.amount) FILTER (WHERE tr.type = 'transfer'), 0) as transfer_amount,
			COALESCE(SUM(tr.amount) FILTER (WHERE tr.type = 'income'), 0) - 
			COALESCE(SUM(tr.amount) FILTER (WHERE tr.type = 'expense'), 0) as net
		FROM tags t
		INNER JOIN transaction_tags tt ON t.id = tt.tag_id
		INNER JOIN transactions tr ON tt.transaction_id = tr.id
		%s
		GROUP BY t.id, t.name 
		ORDER BY t.name ASC
	`, whereClause)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return schemas.SummaryTagSchema{}, fmt.Errorf("get tag summary: %w", err)
	}
	defer rows.Close()

	var items []schemas.SummaryTagitem
	for rows.Next() {
		var item schemas.SummaryTagitem
		if err := rows.Scan(
			&item.TagID, &item.TagName, &item.TotalCount,
			&item.IncomeCount, &item.ExpenseCount, &item.TransferCount,
			&item.IncomeAmount, &item.ExpenseAmount, &item.TransferAmount, &item.Net,
		); err != nil {
			return schemas.SummaryTagSchema{}, fmt.Errorf("scan tag summary: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		items = []schemas.SummaryTagitem{}
	}

	return schemas.SummaryTagSchema{Data: items}, nil
}
