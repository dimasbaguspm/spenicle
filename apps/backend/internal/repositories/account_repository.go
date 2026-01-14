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

// List returns a paginated list of accounts
func (ar AccountRepository) List(ctx context.Context, query models.ListAccountsRequestModel) (models.ListAccountsResponseModel, error) {
	// Enforce page size limits
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 10
	}
	if query.PageNumber <= 0 {
		query.PageNumber = 1
	}

	sortByMap := map[string]string{
		"name":         "name",
		"type":         "type",
		"amount":       "amount",
		"displayOrder": "display_order",
		"createdAt":    "created_at",
		"updatedAt":    "updated_at",
	}
	sortOrderMap := map[string]string{
		"asc":  "ASC",
		"desc": "DESC",
	}

	sortColumn, ok := sortByMap[query.SortBy]
	if !ok {
		sortColumn = "created_at"
	}
	sortOrder, ok := sortOrderMap[query.SortOrder]
	if !ok {
		sortOrder = "DESC"
	}

	offset := (query.PageNumber - 1) * query.PageSize
	searchPattern := "%" + query.Name + "%"

	countSQL := `SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL`
	var totalCount int
	if err := ar.pgx.QueryRow(ctx, countSQL).Scan(&totalCount); err != nil {
		return models.ListAccountsResponseModel{}, huma.Error400BadRequest("Unable to count accounts", err)
	}

	sql := `SELECT id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at
			FROM accounts
			WHERE deleted_at IS NULL
			AND (name ILIKE $1 OR $1 = '%%')
			ORDER BY ` + sortColumn + ` ` + sortOrder + `
			LIMIT $2 OFFSET $3`

	rows, err := ar.pgx.Query(ctx, sql, searchPattern, query.PageSize, offset)
	if err != nil {
		return models.ListAccountsResponseModel{}, huma.Error400BadRequest("Unable to query accounts", err)
	}
	defer rows.Close()

	var items []models.AccountModel
	for rows.Next() {
		var item models.AccountModel
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.Note, &item.Amount, &item.Icon, &item.IconColor, &item.DisplayOrder, &item.ArchivedAt, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt)
		if err != nil {
			return models.ListAccountsResponseModel{}, huma.Error400BadRequest("Unable to scan account data", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.ListAccountsResponseModel{}, huma.Error400BadRequest("Error reading account rows", err)
	}

	if items == nil {
		items = []models.AccountModel{}
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = (totalCount + query.PageSize - 1) / query.PageSize
	}

	return models.ListAccountsResponseModel{
		Data:       items,
		PageNumber: query.PageNumber,
		PageSize:   query.PageSize,
		TotalCount: totalCount,
		TotalPages: totalPages,
	}, nil
}

func (ar AccountRepository) Get(ctx context.Context, id int64) (models.AccountModel, error) {
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

func (ar AccountRepository) Create(ctx context.Context, payload models.CreateAccountRequestModel) (models.CreateAccountResponseModel, error) {
	var data models.AccountModel

	sql := `INSERT INTO accounts (name, type, note, amount, icon, icon_color, display_order)
			VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(display_order) + 1 FROM accounts), 0))
			RETURNING id, name, type, note, amount, icon, icon_color, display_order, archived_at, created_at, updated_at, deleted_at`

	err := ar.pgx.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Amount, payload.Icon, payload.IconColor).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Amount, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt)

	if err != nil {
		return models.CreateAccountResponseModel{}, huma.Error400BadRequest("Unable to create account", err)
	}

	return models.CreateAccountResponseModel{AccountModel: data}, nil
}

func (ar AccountRepository) Update(ctx context.Context, id int64, payload models.UpdateAccountRequestModel) (models.UpdateAccountResponseModel, error) {
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
			return models.UpdateAccountResponseModel{}, huma.Error404NotFound("Account not found")
		}
		return models.UpdateAccountResponseModel{}, huma.Error400BadRequest("Unable to update account", err)
	}

	return models.UpdateAccountResponseModel{AccountModel: data}, nil
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
