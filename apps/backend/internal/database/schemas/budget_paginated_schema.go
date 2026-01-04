package schemas

// PaginatedBudgetSchema represents paginated budget results
type PaginatedBudgetSchema struct {
	PageTotal  int            `json:"pageTotal" doc:"Total number of pages" example:"5"`
	PageNumber int            `json:"pageNumber" doc:"Current page number" example:"1"`
	PageSize   int            `json:"pageSize" doc:"Number of items per page" example:"10"`
	TotalCount int            `json:"totalCount" doc:"Total number of items" example:"50"`
	Items      []BudgetSchema `json:"items" doc:"List of budgets"`
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
