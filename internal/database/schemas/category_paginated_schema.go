package schemas

import (
	"github.com/jackc/pgx/v5"
)

// PaginatedCategorySchema represents a paginated list of categories
type PaginatedCategorySchema struct {
	PageTotal  int              `json:"pageTotal" doc:"Total number of pages" example:"5"`
	PageNumber int              `json:"pageNumber" doc:"Current page number" example:"1"`
	PageSize   int              `json:"pageSize" doc:"Number of items per page" example:"10"`
	TotalCount int              `json:"totalCount" doc:"Total number of items" example:"50"`
	Items      []CategorySchema `json:"items" doc:"List of categories in current page"`
}

func (pcs *PaginatedCategorySchema) FromRows(rows pgx.Rows, totalItems int, search SearchParamCategorySchema) (PaginatedCategorySchema, error) {
	pcs.TotalCount = totalItems
	pcs.PageSize = search.PageSize
	pcs.PageNumber = search.PageNumber

	// Ensure PageSize has a sensible default to avoid division by zero.
	if pcs.PageSize <= 0 {
		pcs.PageSize = 10
	}

	// Compute total pages with rounding up.
	pcs.PageTotal = (pcs.TotalCount + pcs.PageSize - 1) / pcs.PageSize

	// ensure Items is initialized to avoid nil slice
	pcs.Items = make([]CategorySchema, 0)

	for rows.Next() {
		var category CategorySchema
		err := rows.Scan(&category.ID, &category.Name, &category.Type, &category.Note, &category.CreatedAt, &category.UpdatedAt, &category.DeletedAt)
		if err != nil {
			return PaginatedCategorySchema{}, err
		}
		pcs.Items = append(pcs.Items, category)
	}

	// Check for errors that occurred during iteration.
	if err := rows.Err(); err != nil {
		return PaginatedCategorySchema{}, err
	}
	return *pcs, nil
}
