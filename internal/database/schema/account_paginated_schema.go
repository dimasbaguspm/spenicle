package schema

import (
	"github.com/jackc/pgx/v5"
)

// PaginatedAccountSchema represents a paginated list of accounts
type PaginatedAccountSchema struct {
	PageTotal  int             `json:"pageTotal" doc:"Total number of pages" example:"5"`
	PageNumber int             `json:"pageNumber" doc:"Current page number" example:"1"`
	PageSize   int             `json:"pageSize" doc:"Number of items per page" example:"10"`
	TotalCount int             `json:"totalCount" doc:"Total number of items" example:"50"`
	Items      []AccountSchema `json:"items" doc:"List of accounts in current page"`
}

func (pas *PaginatedAccountSchema) FromRows(rows pgx.Rows, totalItems int, search SearchParamAccountSchema) (PaginatedAccountSchema, error) {
	pas.TotalCount = totalItems
	pas.PageSize = search.PageSize
	pas.PageNumber = search.PageNumber

	// Ensure PageSize has a sensible default to avoid division by zero.
	if pas.PageSize <= 0 {
		pas.PageSize = 10
	}

	// Compute total pages with rounding up.
	pas.PageTotal = (pas.TotalCount + pas.PageSize - 1) / pas.PageSize

	// ensure Items is initialized to avoid nil slice
	pas.Items = make([]AccountSchema, 0)

	for rows.Next() {
		var account AccountSchema
		err := rows.Scan(&account.ID, &account.Name, &account.Type, &account.Note, &account.Amount, &account.CreatedAt, &account.UpdatedAt, &account.DeletedAt)
		if err != nil {
			return PaginatedAccountSchema{}, err
		}
		pas.Items = append(pas.Items, account)
	}

	// Check for errors that occurred during iteration.
	if err := rows.Err(); err != nil {
		return PaginatedAccountSchema{}, err
	}
	return *pas, nil
}
