package schemas

// PaginatedBudgetSchema represents paginated budget results
type PaginatedBudgetSchema struct {
	Items      []BudgetSchema `json:"items" doc:"List of budgets"`
	TotalCount int            `json:"totalCount" doc:"Total number of budgets" example:"100"`
	Page       int            `json:"page" doc:"Current page number" example:"1"`
	Limit      int            `json:"limit" doc:"Items per page" example:"10"`
}

// FromRows scans multiple database rows into BudgetSchema slice
func (p PaginatedBudgetSchema) FromRows(rows RowsScanner) ([]BudgetSchema, error) {
	var items []BudgetSchema

	for rows.Next() {
		var item BudgetSchema
		err := rows.Scan(
			&item.ID,
			&item.TemplateID,
			&item.AccountID,
			&item.CategoryID,
			&item.PeriodStart,
			&item.PeriodEnd,
			&item.AmountLimit,
			&item.ActualAmount,
			&item.Note,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}
