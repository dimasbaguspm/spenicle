package schema

import (
	"encoding/json"
	"net/url"
	"strconv"

	"github.com/jackc/pgx/v5"
)

// AccountTableName is the name of the accounts table in the database
var AccountTableName = "accounts"

// AccountSchema represents the schema for an account
type AccountSchema struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	Note      string `json:"note"`
	Amount    int64  `json:"amount"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	DeletedAt string `json:"deleted_at"`
}

// ToJSON converts AccountSchema to a JSON-compatible map
func (as *AccountSchema) ToJSON() map[string]interface{} {
	return map[string]interface{}{
		"id":         as.ID,
		"name":       as.Name,
		"type":       as.Type,
		"note":       as.Note,
		"amount":     as.Amount,
		"created_at": as.CreatedAt,
		"updated_at": as.UpdatedAt,
		"deleted_at": as.DeletedAt,
	}
}

// FromJSON populates AccountSchema from a JSON-compatible map
func (as *AccountSchema) FromJSON(data map[string]interface{}) {
	if v, ok := data["id"].(string); ok {
		as.ID = v
	}
	if v, ok := data["name"].(string); ok {
		as.Name = v
	}
	if v, ok := data["type"].(string); ok {
		as.Type = v
	}
	if v, ok := data["note"].(string); ok {
		as.Note = v
	}
	if v, ok := data["amount"].(int64); ok {
		as.Amount = v
	}
	if v, ok := data["created_at"].(string); ok {
		as.CreatedAt = v
	}
	if v, ok := data["updated_at"].(string); ok {
		as.UpdatedAt = v
	}
	if v, ok := data["deleted_at"].(string); ok {
		as.DeletedAt = v
	}
}

// PaginatedAccountSchema represents a paginated list of accounts
type PaginatedAccountSchema struct {
	PageTotal  int             `json:"page_total"`
	PageNumber int             `json:"page_number"`
	PageSize   int             `json:"page_size"`
	TotalCount int             `json:"total_count"`
	Items      []AccountSchema `json:"items"`
}

func (pas *PaginatedAccountSchema) FromRows(rows pgx.Rows, totalItems int, search SearchParamAccountSchema) PaginatedAccountSchema {
	pas.TotalCount = totalItems
	pas.PageSize = search.PageSize
	pas.PageNumber = search.PageNumber

	if pas.TotalCount%pas.PageSize == 0 {
		pas.PageTotal = pas.TotalCount / pas.PageSize
	} else {
		pas.PageTotal = (pas.TotalCount / pas.PageSize) + 1
	}

	// ensure Items is initialized to avoid nil slice
	pas.Items = make([]AccountSchema, 0)

	for rows.Next() {
		var account AccountSchema
		err := rows.Scan(&account.ID, &account.Name, &account.Type, &account.Note, &account.Amount, &account.CreatedAt, &account.UpdatedAt, &account.DeletedAt)
		if err != nil {
			continue
		}
		pas.Items = append(pas.Items, account)
	}
	return *pas
}

// ToJSON converts PaginatedAccountSchema to a JSON-compatible map
func (pas *PaginatedAccountSchema) ToJSON() []byte {
	jsonData, _ := json.Marshal(map[string]interface{}{
		"pageTotal":  pas.PageTotal,
		"pageNumber": pas.PageNumber,
		"pageSize":   pas.PageSize,
		"totalCount": pas.TotalCount,
		"items":      pas.Items,
	})
	return jsonData
}

// FromJSON populates PaginatedAccountSchema from a JSON-compatible map
func (pas *PaginatedAccountSchema) FromJSON(data map[string]interface{}) PaginatedAccountSchema {
	if v, ok := data["pageTotal"].(int); ok {
		pas.PageTotal = v
	}
	if v, ok := data["pageNumber"].(int); ok {
		pas.PageNumber = v
	}
	if v, ok := data["pageSize"].(int); ok {
		pas.PageSize = v
	}
	if v, ok := data["totalCount"].(int); ok {
		pas.TotalCount = v
	}
	if v, ok := data["items"].([]AccountSchema); ok {
		pas.Items = v
	}
	return *pas
}

// SearchParamAccountSchema represents the search parameters for querying accounts
type SearchParamAccountSchema struct {
	Name           string `json:"name"`
	Type           string `json:"type" validate:"omitempty,oneof=expense income"`
	OrderBy        string `json:"order_by" validate:"omitempty,oneof=name type amount created_at updated_at"`
	OrderDirection string `json:"order_direction" validate:"omitempty,oneof=asc desc"`
	PageNumber     int    `json:"page_number" validate:"gte=1"`
	PageSize       int    `json:"page_size" validate:"gte=1,lte=100"`
}

// FromUrl populates SearchParamAccountSchema from URL query parameters
func (spas *SearchParamAccountSchema) ParseFromQuery(payload url.Values) SearchParamAccountSchema {
	if v := payload.Get("name"); v != "" {
		spas.Name = v
	}
	if v := payload.Get("type"); v != "" {
		spas.Type = v
	}
	if v := payload.Get("order_by"); v != "" {
		spas.OrderBy = v
	}
	if v := payload.Get("order_direction"); v != "" {
		spas.OrderDirection = v
	}

	if v := payload.Get("page_number"); v != "" {
		spas.PageNumber, _ = strconv.Atoi(v)
	} else {
		spas.PageNumber = 1
	}

	if v := payload.Get("page_size"); v != "" {
		spas.PageSize, _ = strconv.Atoi(v)
	} else {
		spas.PageSize = 10
	}
	return *spas
}

// CreateAccountSchema represents the schema for creating a new account
type CreateAccountSchema struct {
	Name   string `json:"name" validate:"required"`
	Type   string `json:"type" validate:"required,oneof=expense income"`
	Note   string `json:"note" validate:"omitempty"`
	Amount int64  `json:"amount" validate:"gte=0"`
}

// FromJSON populates CreateAccountSchema from a JSON-compatible map
func (cas *CreateAccountSchema) FromJSON(data map[string]interface{}) CreateAccountSchema {
	if v, ok := data["name"].(string); ok {
		cas.Name = v
	}
	if v, ok := data["type"].(string); ok {
		cas.Type = v
	}
	if v, ok := data["note"].(string); ok {
		cas.Note = v
	}
	if v, ok := data["amount"].(int64); ok {
		cas.Amount = v
	}
	return *cas
}

// UpdateAccountSchema represents the schema for updating an account
type UpdateAccountSchema struct {
	Name   *string `json:"name"`
	Type   *string `json:"type" validate:"omitempty,oneof=expense income"`
	Note   *string `json:"note"`
	Amount *int64  `json:"amount" validate:"omitempty,gte=0"`
}

// FromJSON populates UpdateAccountSchema from a JSON-compatible map
func (uas *UpdateAccountSchema) FromJSON(data map[string]interface{}) UpdateAccountSchema {
	if v, ok := data["name"].(string); ok {
		uas.Name = &v
	}
	if v, ok := data["type"].(string); ok {
		uas.Type = &v
	}
	if v, ok := data["note"].(string); ok {
		uas.Note = &v
	}
	if v, ok := data["amount"].(int64); ok {
		uas.Amount = &v

	}
	return *uas
}

func (uas *UpdateAccountSchema) IsChanged(updateData UpdateAccountSchema) bool {
	if updateData.Name != nil {
		return true
	}
	if updateData.Type != nil {
		return true
	}
	if updateData.Note != nil {
		return true
	}
	if updateData.Amount != nil {
		return true
	}
	return false
}
