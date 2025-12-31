package schema

import (
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

// PaginatedAccountSchema represents a paginated list of accounts
type PaginatedAccountSchema struct {
	PageTotal  int             `json:"pageTotal"`
	PageNumber int             `json:"pageNumber"`
	PageSize   int             `json:"pageSize"`
	TotalCount int             `json:"totalCount"`
	Items      []AccountSchema `json:"items"`
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

// ToJSON converts PaginatedAccountSchema to a JSON-compatible map
func (pas *PaginatedAccountSchema) ToJSON() ([]byte, error) {
	return json.Marshal(pas)
}
