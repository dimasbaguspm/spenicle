package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AccountRepository struct {
	pgx *pgxpool.Pool
}

func NewAccountRepository(pgx *pgxpool.Pool) AccountRepository {
	return AccountRepository{pgx}
}

func (ar AccountRepository) GetPaged(ctx context.Context, query models.AccountsSearchModel) (models.AccountsPagedModel, error) {
	sortByMap := map[string]string{
		"name":         "a.name",
		"type":         "a.type",
		"amount":       "a.amount",
		"displayOrder": "a.display_order",
		"createdAt":    "a.created_at",
		"updatedAt":    "a.updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]

	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered_accounts AS (
			SELECT 
				id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at,
				COUNT(*) OVER() as total_count
			FROM accounts
			WHERE deleted_at IS NULL
				AND (array_length($5::int8[], 1) IS NULL OR id = ANY($5::int8[]))
				AND ($6::text IS NULL OR $6::text = '' OR name ILIKE '%' || $6::text || '%')
				AND (array_length($7::text[], 1) IS NULL OR type = ANY($7::text[]))
				AND (
					$8::text IS NULL OR $8::text = '' OR
					($8::text = 'true' AND archived_at IS NOT NULL) OR
					($8::text = 'false' AND archived_at IS NULL)
				)
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3
		)
		SELECT
			id,
			name,
			type,
			note,
			amount,
			icon,
			icon_color,
			display_order,
			archived_at,
			created_at,
			updated_at,
			total_count
		FROM filtered_accounts`

	var (
		ids   []int64
		types []string
	)

	if len(query.ID) > 0 {
		for _, id := range query.ID {
			ids = append(ids, int64(id))
		}
	}
	if len(query.Type) > 0 {
		types = query.Type
	}

	rows, err := ar.pgx.Query(ctx, sql, query.PageSize, offset, ids, types, query.Name, query.Archived)
	if err != nil {
		return models.AccountsPagedModel{}, huma.Error400BadRequest("Unable to query accounts", err)
	}
	defer rows.Close()

	var items []models.AccountModel
	var totalCount int

	for rows.Next() {
		var item models.AccountModel
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.Note, &item.Amount, &item.Icon, &item.IconColor, &item.DisplayOrder, &item.ArchivedAt, &item.CreatedAt, &item.UpdatedAt, &totalCount)
		if err != nil {
			return models.AccountsPagedModel{}, huma.Error400BadRequest("Unable to scan account data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.AccountsPagedModel{}, huma.Error400BadRequest("Error reading account rows", err)
	}

	if items == nil {
		items = []models.AccountModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.AccountsPagedModel{
		Items:      items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
		TotalCount: totalCount,
	}, nil
}

func (ar AccountRepository) GetDetail(ctx context.Context, id int64) (models.AccountModel, error) {
	var data models.AccountModel

	sql := `SELECT id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at
			FROM accounts
			WHERE id = $1 AND deleted_at IS NULL`

	err := ar.pgx.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Amount, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AccountModel{}, huma.Error404NotFound("Account not found")
		}
		return models.AccountModel{}, huma.Error400BadRequest("Unable to query account", err)
	}

	return data, nil
}

func (ar AccountRepository) Create(ctx context.Context, payload models.CreateAccountModel) (models.AccountModel, error) {
	var data models.AccountModel

	sql := `INSERT INTO accounts (name, type, note, amount, icon, icon_color, display_order)
			VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(display_order) + 1 FROM accounts), 0))
			RETURNING id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := ar.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Amount, payload.Icon, payload.IconColor).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Amount, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		return models.AccountModel{}, huma.Error400BadRequest("Unable to create account", err)
	}

	return data, nil
}

func (ar AccountRepository) Update(ctx context.Context, id int64, payload models.UpdateAccountModel) (models.AccountModel, error) {
	var data models.AccountModel

	sql := `UPDATE accounts
			SET name = COALESCE($1, name),
				type = COALESCE($2, type),
				note = COALESCE($3, note),
				amount = COALESCE($4, amount),
				icon = COALESCE($5, icon),
				icon_color = COALESCE($6, icon_color),
				archived_at = CASE
					WHEN $7::text = '' OR $7::text = 'null' THEN NULL
					WHEN $7::text IS NOT NULL THEN CURRENT_TIMESTAMP
					ELSE archived_at
				END,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $8 AND deleted_at IS NULL
			RETURNING id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := ar.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Amount, payload.Icon, payload.IconColor, payload.ArchivedAt, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Amount, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AccountModel{}, huma.Error404NotFound("Account not found")
		}
		return models.AccountModel{}, huma.Error400BadRequest("Unable to update account", err)
	}

	return data, nil
}

func (ar AccountRepository) Delete(ctx context.Context, id int64) error {
	sql := `UPDATE accounts
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND deleted_at IS NULL`

	cmdTag, err := ar.pgx.Exec(ctx, sql, id)
	if err != nil {
		return huma.Error400BadRequest("Unable to delete account", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Account not found")
	}

	return nil
}

func (ar AccountRepository) Reorder(ctx context.Context, items []models.ReorderAccountItemModel) error {
	if len(items) == 0 {
		return nil
	}

	var caseExpr string
	for i, item := range items {
		if i > 0 {
			caseExpr += " "
		}
		caseExpr += fmt.Sprintf("WHEN id = %d THEN %d", item.ID, item.DisplayOrder)
	}

	sql := `UPDATE accounts
			SET display_order = CASE ` + caseExpr + ` END,
				updated_at = CURRENT_TIMESTAMP
			WHERE deleted_at IS NULL`

	_, err := ar.pgx.Exec(ctx, sql)
	if err != nil {
		return huma.Error400BadRequest("Unable to reorder accounts", err)
	}

	return nil
}

// UpdateBalanceWithTx updates an account's balance within a provided database transaction
func (ar AccountRepository) UpdateBalanceWithTx(ctx context.Context, tx pgx.Tx, accountID int64, deltaAmount int64) error {
	sql := `UPDATE accounts
			SET amount = amount + $1,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND deleted_at IS NULL`

	cmdTag, err := tx.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return fmt.Errorf("unable to update account balance: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("account not found")
	}

	return nil
}
