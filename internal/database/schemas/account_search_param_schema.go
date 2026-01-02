package schemas

import (
	"net/url"
	"strconv"
)

// SearchParamAccountSchema represents the search parameters for querying accounts
type SearchParamAccountSchema struct {
	ID             []int    `query:"id" doc:"Filter by account ID" minimum:"0"`
	Name           string   `query:"name"`
	Type           []string `query:"type" enum:"expense,income"`
	OrderBy        string   `query:"orderBy" enum:"name,type,amount,createdAt,updatedAt"`
	OrderDirection string   `query:"orderDirection" enum:"asc,desc"`
	PageNumber     int      `query:"pageNumber" minimum:"1" default:"1"`
	PageSize       int      `query:"pageSize" minimum:"1" maximum:"100" default:"10"`
}

// ParseFromQuery populates SearchParamAccountSchema from URL query parameters.
// It supports both camelCase and snake_case parameter names for flexibility.
func (spas *SearchParamAccountSchema) ParseFromQuery(payload url.Values) SearchParamAccountSchema {
	// Parse ID array
	if ids := payload["id"]; len(ids) > 0 {
		for _, idStr := range ids {
			if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
				spas.ID = append(spas.ID, id)
			}
		}
	}

	if v := payload.Get("name"); v != "" {
		spas.Name = v
	}

	// Parse Type array
	if types := payload["type"]; len(types) > 0 {
		spas.Type = types
	}

	// support camelCase first, fall back to snake_case
	if v := payload.Get("orderBy"); v != "" {
		spas.OrderBy = v
	}

	if v := payload.Get("orderDirection"); v != "" {
		spas.OrderDirection = v
	}

	// page number
	if v := payload.Get("pageNumber"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			spas.PageNumber = n
		} else {
			spas.PageNumber = 1
		}
	} else {
		spas.PageNumber = 1
	}

	// page size
	if v := payload.Get("pageSize"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			spas.PageSize = n
		} else {
			spas.PageSize = 10
		}
	} else {
		spas.PageSize = 10
	}

	// enforce sane bounds for page size
	if spas.PageSize < 1 {
		spas.PageSize = 1
	}
	if spas.PageSize > 100 {
		spas.PageSize = 100
	}

	return *spas
}
