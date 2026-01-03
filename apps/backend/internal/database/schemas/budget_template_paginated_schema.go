package schemas

// PaginatedBudgetTemplateSchema represents paginated budget template results
type PaginatedBudgetTemplateSchema struct {
	Items      []BudgetTemplateSchema `json:"items" doc:"List of budget templates"`
	TotalCount int                    `json:"totalCount" doc:"Total number of budget templates" example:"100"`
	Page       int                    `json:"page" doc:"Current page number" example:"1"`
	Limit      int                    `json:"limit" doc:"Items per page" example:"10"`
}

// RowScanner interface for database row scanning
type RowScanner interface {
	Scan(dest ...interface{}) error
}

// RowsScanner interface for scanning multiple rows
type RowsScanner interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close()
}

// FromRows scans multiple database rows into BudgetTemplateSchema slice
func (p PaginatedBudgetTemplateSchema) FromRows(rows RowsScanner) ([]BudgetTemplateSchema, error) {
	var items []BudgetTemplateSchema

	for rows.Next() {
		var item BudgetTemplateSchema
		err := rows.Scan(
			&item.ID,
			&item.AccountID,
			&item.CategoryID,
			&item.AmountLimit,
			&item.Recurrence,
			&item.StartDate,
			&item.EndDate,
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
