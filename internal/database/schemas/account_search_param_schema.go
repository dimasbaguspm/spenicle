package schemas

import (
	"net/url"
	"strconv"
)

// SearchParamAccountSchema represents the search parameters for querying accounts
type SearchParamAccountSchema struct {
	Name           string `query:"name"`
	Type           string `query:"type" enum:"expense,income"`
	OrderBy        string `query:"orderBy" enum:"name,type,amount,createdAt,updatedAt"`
	OrderDirection string `query:"orderDirection" enum:"asc,desc"`
	PageNumber     int    `query:"pageNumber" minimum:"1" default:"1"`
	PageSize       int    `query:"pageSize" minimum:"1" maximum:"100" default:"10"`
}

// ParseFromQuery populates SearchParamAccountSchema from URL query parameters.
// It supports both camelCase and snake_case parameter names for flexibility.
func (spas *SearchParamAccountSchema) ParseFromQuery(payload url.Values) SearchParamAccountSchema {
	if v := payload.Get("name"); v != "" {
		spas.Name = v
	}
	if v := payload.Get("type"); v != "" {
		spas.Type = v
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
