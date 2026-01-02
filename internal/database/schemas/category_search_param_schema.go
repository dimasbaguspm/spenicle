package schemas

import (
	"net/url"
	"strconv"
)

// SearchParamCategorySchema represents the search parameters for querying categories
type SearchParamCategorySchema struct {
	ID             []int    `query:"id" doc:"Filter by category ID" minimum:"0"`
	Name           string   `query:"name"`
	Type           []string `query:"type" enum:"expense,income,transfer"`
	OrderBy        string   `query:"orderBy" enum:"name,type,createdAt,updatedAt"`
	OrderDirection string   `query:"orderDirection" enum:"asc,desc"`
	PageNumber     int      `query:"pageNumber" minimum:"1" default:"1"`
	PageSize       int      `query:"pageSize" minimum:"1" maximum:"100" default:"10"`
}

// ParseFromQuery populates SearchParamCategorySchema from URL query parameters.
// It supports both camelCase and snake_case parameter names for flexibility.
func (spcs *SearchParamCategorySchema) ParseFromQuery(payload url.Values) SearchParamCategorySchema {
	// Parse ID array
	if ids := payload["id"]; len(ids) > 0 {
		for _, idStr := range ids {
			if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
				spcs.ID = append(spcs.ID, id)
			}
		}
	}

	if v := payload.Get("name"); v != "" {
		spcs.Name = v
	}

	// Parse Type array
	if types := payload["type"]; len(types) > 0 {
		spcs.Type = types
	}

	// support camelCase first, fall back to snake_case
	if v := payload.Get("orderBy"); v != "" {
		spcs.OrderBy = v
	}

	if v := payload.Get("orderDirection"); v != "" {
		spcs.OrderDirection = v
	}

	// page number
	if v := payload.Get("pageNumber"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			spcs.PageNumber = n
		} else {
			spcs.PageNumber = 1
		}
	} else {
		spcs.PageNumber = 1
	}

	// page size
	if v := payload.Get("pageSize"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			spcs.PageSize = n
		} else {
			spcs.PageSize = 10
		}
	} else {
		spcs.PageSize = 10
	}

	return *spcs
}
