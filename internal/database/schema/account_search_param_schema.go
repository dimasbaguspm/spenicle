package schema

import (
	"net/url"
	"strconv"
)

// SearchParamAccountSchema represents the search parameters for querying accounts
type SearchParamAccountSchema struct {
	Name           string `json:"name"`
	Type           string `json:"type" validate:"omitempty,oneof=expense income"`
	OrderBy        string `json:"orderBy" validate:"omitempty,oneof=name type amount createdAt updatedAt"`
	OrderDirection string `json:"orderDirection" validate:"omitempty,oneof=asc desc"`
	PageNumber     int    `json:"pageNumber" validate:"gte=1"`
	PageSize       int    `json:"pageSize" validate:"gte=1,lte=100"`
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
