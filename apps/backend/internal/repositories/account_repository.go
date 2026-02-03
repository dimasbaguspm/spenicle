package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/jackc/pgx/v5"
)

type AccountRepository struct {
	db DBQuerier
}

func NewAccountRepository(db DBQuerier) AccountRepository {
	return AccountRepository{db}
}

func (ar AccountRepository) GetPaged(ctx context.Context, query models.AccountsSearchModel) (models.AccountsPagedModel, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

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

	sortColumn := sortByMap[query.SortBy]
	sortOrder := sortOrderMap[query.SortOrder]

	offset := (query.PageNumber - 1) * query.PageSize

	sql := `
		WITH filtered_accounts AS (
			SELECT 
				a.id, a.name, a.type, a.note, a.amount, a.icon, a.icon_color, a.display_order, a.archived_at, a.created_at, a.updated_at,
				b.id as budget_id, b.template_id, b.account_id, b.category_id, b.period_start, b.period_end, b.amount_limit, 
				COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.date >= b.period_start AND t.date <= b.period_end AND t.deleted_at IS NULL), 0) as actual_amount,
				b.period_type, b.name as budget_name,
				COUNT(*) OVER() as total_count
			FROM accounts a
			LEFT JOIN budgets b ON b.account_id = a.id AND b.status = 'active' AND b.period_start <= CURRENT_DATE AND b.period_end >= CURRENT_DATE AND b.deleted_at IS NULL
			WHERE a.deleted_at IS NULL
				AND (array_length($3::int8[], 1) IS NULL OR a.id = ANY($3::int8[]))
				AND ($5::text IS NULL OR $5::text = '' OR a.name ILIKE '%' || $5::text || '%')
				AND (array_length($4::text[], 1) IS NULL OR a.type = ANY($4::text[]))
				AND (
					$6::text IS NULL OR $6::text = '' OR
					($6::text = 'true' AND a.archived_at IS NOT NULL) OR
					($6::text = 'false' AND a.archived_at IS NULL)
				)
			ORDER BY a.` + sortColumn + ` ` + sortOrder + `
			LIMIT $1 OFFSET $2
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
			budget_id,
			template_id,
			account_id,
			category_id,
			period_start,
			period_end,
			amount_limit,
			actual_amount,
			period_type,
			budget_name,
			total_count
		FROM filtered_accounts
		ORDER BY ` + sortColumn + ` ` + sortOrder + `
	`

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

	queryStart := time.Now()
	rows, err := ar.db.Query(ctx, sql, query.PageSize, offset, ids, types, query.Name, query.Archived)
	observability.RecordQueryDuration("SELECT", "accounts", time.Since(queryStart).Seconds())
	if err != nil {
		observability.RecordError("database")
		return models.AccountsPagedModel{}, huma.Error500InternalServerError("Unable to query accounts", err)
	}
	defer rows.Close()

	var items []models.AccountModel
	var totalCount int

	for rows.Next() {
		var item models.AccountModel
		var budgetID *int64
		var templateID *int64
		var accountID *int64
		var categoryID *int64
		var periodStart *time.Time
		var periodEnd *time.Time
		var amountLimit *int64
		var actualAmount *int64
		var periodType *string
		var budgetName *string
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.Note, &item.Amount, &item.Icon, &item.IconColor, &item.DisplayOrder, &item.ArchivedAt, &item.CreatedAt, &item.UpdatedAt, &budgetID, &templateID, &accountID, &categoryID, &periodStart, &periodEnd, &amountLimit, &actualAmount, &periodType, &budgetName, &totalCount)
		if err != nil {
			return models.AccountsPagedModel{}, huma.Error500InternalServerError("Unable to scan account data", err)
		}
		if budgetID != nil {
			item.EmbeddedBudget = &models.EmbeddedBudget{
				ID:           *budgetID,
				TemplateID:   templateID,
				AccountID:    accountID,
				CategoryID:   categoryID,
				PeriodStart:  *periodStart,
				PeriodEnd:    *periodEnd,
				AmountLimit:  *amountLimit,
				ActualAmount: *actualAmount,
				PeriodType:   *periodType,
				Name:         *budgetName,
			}
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return models.AccountsPagedModel{}, huma.Error500InternalServerError("Error reading account rows", err)
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
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	var data models.AccountModel
	var budgetID *int64
	var templateID *int64
	var accountID *int64
	var categoryID *int64
	var periodStart *time.Time
	var periodEnd *time.Time
	var amountLimit *int64
	var actualAmount *int64
	var periodType *string
	var budgetName *string

	sql := `SELECT a.id, a.name, a.type, a.note, a.amount, a.icon, a.icon_color, a.display_order, a.archived_at, a.created_at, a.updated_at, a.deleted_at,
			b.id as budget_id, b.template_id, b.account_id, b.category_id, b.period_start, b.period_end, b.amount_limit, 
			COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.date >= b.period_start AND t.date <= b.period_end AND t.deleted_at IS NULL), 0) as actual_amount,
			b.period_type, b.name as budget_name
			FROM accounts a
			LEFT JOIN budgets b ON b.account_id = a.id AND b.status = 'active' AND b.period_start <= CURRENT_DATE AND b.period_end >= CURRENT_DATE AND b.deleted_at IS NULL
			WHERE a.id = $1 AND a.deleted_at IS NULL`

	queryStart := time.Now()
	err := ar.db.QueryRow(ctx, sql, id).Scan(&data.ID, &data.Name, &data.Type, &data.Note, &data.Amount, &data.Icon, &data.IconColor, &data.DisplayOrder, &data.ArchivedAt, &data.CreatedAt, &data.UpdatedAt, &data.DeletedAt, &budgetID, &templateID, &accountID, &categoryID, &periodStart, &periodEnd, &amountLimit, &actualAmount, &periodType, &budgetName)
	observability.RecordQueryDuration("SELECT", "accounts", time.Since(queryStart).Seconds())

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AccountModel{}, huma.Error404NotFound("Account not found")
		}
		observability.RecordError("database")
		return models.AccountModel{}, huma.Error500InternalServerError("Unable to query account", err)
	}

	if budgetID != nil {
		data.EmbeddedBudget = &models.EmbeddedBudget{
			ID:           *budgetID,
			TemplateID:   templateID,
			AccountID:    accountID,
			CategoryID:   categoryID,
			PeriodStart:  *periodStart,
			PeriodEnd:    *periodEnd,
			AmountLimit:  *amountLimit,
			ActualAmount: *actualAmount,
			PeriodType:   *periodType,
			Name:         *budgetName,
		}
	}

	return data, nil
}

func (ar AccountRepository) Create(ctx context.Context, payload models.CreateAccountModel) (models.AccountModel, error) {
	var ID int64

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `
		INSERT INTO accounts (name, type, note, icon, icon_color, display_order)
		VALUES ($1, $2, $3, $4, $5,  COALESCE((SELECT MAX(display_order) + 1 FROM accounts WHERE deleted_at IS NULL), 0))
		RETURNING id
	`

	queryStart := time.Now()
	err := ar.db.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Icon, payload.IconColor).Scan(&ID)
	observability.RecordQueryDuration("INSERT", "accounts", time.Since(queryStart).Seconds())

	if err != nil {
		observability.RecordError("database")
		return models.AccountModel{}, huma.Error500InternalServerError("Unable to create account", err)
	}

	return ar.GetDetail(ctx, ID)
}

func (ar AccountRepository) Update(ctx context.Context, id int64, payload models.UpdateAccountModel) (models.AccountModel, error) {
	var ID int64

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE accounts
			SET name = COALESCE($1, name),
				type = COALESCE($2, type),
				note = COALESCE($3, note),
				icon = COALESCE($4, icon),
				icon_color = COALESCE($5, icon_color),
				archived_at = CASE
					WHEN $6::text = '' OR $6::text = 'null' THEN NULL
					WHEN $6::text IS NOT NULL THEN CURRENT_TIMESTAMP
					ELSE archived_at
				END,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $7 AND deleted_at IS NULL
			RETURNING id`

	queryStart := time.Now()
	err := ar.db.QueryRow(ctx, sql, payload.Name, payload.Type, payload.Note, payload.Icon, payload.IconColor, payload.ArchivedAt, id).Scan(&ID)
	observability.RecordQueryDuration("UPDATE", "accounts", time.Since(queryStart).Seconds())

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AccountModel{}, huma.Error404NotFound("Account not found")
		}
		observability.RecordError("database")
		return models.AccountModel{}, huma.Error500InternalServerError("Unable to update account", err)
	}

	return ar.GetDetail(ctx, ID)
}

func (ar AccountRepository) ValidateIDsExist(ctx context.Context, ids []int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	if len(ids) == 0 {
		return huma.Error400BadRequest("No account IDs provided")
	}

	var matched int
	sql := `SELECT COUNT(1) FROM accounts WHERE id = ANY($1::int8[]) AND deleted_at IS NULL`
	if err := ar.db.QueryRow(ctx, sql, ids).Scan(&matched); err != nil {
		return huma.Error500InternalServerError("Unable to validate accounts", err)
	}
	if matched != len(ids) {
		return huma.Error404NotFound("One or more accounts not found")
	}

	var totalActive int
	if err := ar.db.QueryRow(ctx, `SELECT COUNT(1) FROM accounts WHERE deleted_at IS NULL`).Scan(&totalActive); err != nil {
		return huma.Error500InternalServerError("Unable to validate account count", err)
	}
	if totalActive != len(ids) {
		return huma.Error400BadRequest("Provided account IDs must include all active accounts")
	}

	return nil
}

func (ar AccountRepository) Delete(ctx context.Context, id int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	delSQL := `UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	queryStart := time.Now()
	cmdTag, err := ar.db.Exec(ctx, delSQL, id)
	observability.RecordQueryDuration("DELETE", "accounts", time.Since(queryStart).Seconds())
	if err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to delete account", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return huma.Error404NotFound("Account not found")
	}
	return nil
}

func (ar AccountRepository) GetActiveIDsOrdered(ctx context.Context) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	rows, err := ar.db.Query(ctx, `SELECT id FROM accounts WHERE deleted_at IS NULL ORDER BY display_order ASC, id ASC`)
	if err != nil {
		return nil, huma.Error500InternalServerError("Unable to query account ids", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, huma.Error500InternalServerError("Unable to scan account id", err)
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, huma.Error500InternalServerError("Error reading account ids", err)
	}

	return ids, nil
}

func (ar AccountRepository) Reorder(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	reorderSQL := `UPDATE accounts SET display_order = v.new_order, updated_at = CURRENT_TIMESTAMP FROM (SELECT id::bigint AS id, ord - 1 AS new_order FROM unnest($1::int8[]) WITH ORDINALITY AS t(id, ord)) v WHERE accounts.id = v.id AND deleted_at IS NULL`
	queryStart := time.Now()
	if _, err := ar.db.Exec(ctx, reorderSQL, ids); err != nil {
		observability.RecordError("database")
		return huma.Error500InternalServerError("Unable to reorder accounts", err)
	}
	observability.RecordQueryDuration("UPDATE", "accounts", time.Since(queryStart).Seconds())
	return nil
}

func (ar AccountRepository) UpdateBalance(ctx context.Context, accountID int64, deltaAmount int64) error {
	ctx, cancel := context.WithTimeout(ctx, constants.DBTimeout)
	defer cancel()

	sql := `UPDATE accounts
			SET amount = amount + $1,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND deleted_at IS NULL`

	cmdTag, err := ar.db.Exec(ctx, sql, deltaAmount, accountID)
	if err != nil {
		return fmt.Errorf("unable to update account balance: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("account not found")
	}

	return nil
}
