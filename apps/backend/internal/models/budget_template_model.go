package models

import "time"

type BudgetTemplateModel struct {
	ID             int64      `json:"id" doc:"Unique identifier"`
	AccountID      *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions"`
	CategoryID     *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions"`
	AmountLimit    int64      `json:"amountLimit" doc:"Budget limit amount in cents" minimum:"1"`
	Recurrence     string     `json:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate      time.Time  `json:"startDate" doc:"Start date for recurrence" format:"date-time"`
	EndDate        *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Name           string     `json:"name" doc:"Template name" maxLength:"100"`
	Note           *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
	Active         bool       `json:"active" doc:"Whether this template is active and generating budgets"`
	LastExecutedAt *time.Time `json:"lastExecutedAt,omitempty" doc:"Timestamp of the last execution of this template" format:"date-time"`
	NextRunAt      *time.Time `json:"nextRunAt,omitempty" doc:"Next run date for recurring budget creation" format:"date-time"`
	CreatedAt      time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt      *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt      *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type BudgetTemplatesSearchModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,accountId,categoryId,amountLimit,recurrence,startDate,endDate,name,active,nextRunAt,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	IDs         []int64 `query:"id" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
	Recurrence  string  `query:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Filter by recurrence pattern"`
	Active      bool    `query:"active" doc:"Filter by active status"`
}

type BudgetTemplatesPagedModel struct {
	Items      []BudgetTemplateModel `json:"items" doc:"List of budget templates"`
	PageNumber int                   `json:"pageNumber" doc:"Current page number"`
	PageSize   int                   `json:"pageSize" doc:"Items per page"`
	TotalCount int                   `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                   `json:"totalPages" doc:"Total number of pages"`
}

type CreateBudgetTemplateModel struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	AmountLimit int64      `json:"amountLimit" required:"true" minimum:"1" doc:"Budget limit amount in cents"`
	Recurrence  string     `json:"recurrence" required:"true" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate   time.Time  `json:"startDate" required:"true" doc:"Start date for recurrence" format:"date-time"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Name        string     `json:"name" required:"true" doc:"Template name" maxLength:"100"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
	Active      bool       `json:"active" default:"true" doc:"Whether this template is active and generating budgets"`
}

type UpdateBudgetTemplateModel struct {
	Name   *string `json:"name,omitempty" doc:"Template name" maxLength:"100"`
	Note   *string `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
	Active *bool   `json:"active,omitempty" doc:"Whether this template is active and generating budgets"`
}

type BudgetTemplateRelatedBudgetsSearchModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,templateId,accountId,categoryId,periodStart,periodEnd,amountLimit,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	TemplateIDs []int64 `query:"templateId" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
}

type BudgetTemplateRelatedBudgetsPagedModel struct {
	Items      []BudgetModel `json:"items" doc:"List of related budgets"`
	PageNumber int           `json:"pageNumber" doc:"Current page number"`
	PageSize   int           `json:"pageSize" doc:"Items per page"`
	TotalCount int           `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int           `json:"totalPages" doc:"Total number of pages"`
}

// BudgetModel represents a generated budget record (read-only for users)
// Users cannot create/update budgets directly - they create budget templates
// which automatically generate budgets via the worker
type BudgetModel struct {
	ID           int64      `json:"id" doc:"Unique identifier"`
	TemplateID   *int64     `json:"templateId,omitempty" doc:"Budget template ID if generated from template"`
	AccountID    *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions"`
	CategoryID   *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions"`
	PeriodStart  time.Time  `json:"periodStart" doc:"Budget period start date" format:"date-time"`
	PeriodEnd    time.Time  `json:"periodEnd" doc:"Budget period end date" format:"date-time"`
	AmountLimit  int64      `json:"amountLimit" doc:"Budget limit amount in cents" minimum:"1"`
	ActualAmount int64      `json:"actualAmount" doc:"Actual spent amount in cents (computed from transactions)"`
	Status       string     `json:"status" enum:"active,inactive" doc:"Budget status (active or inactive)"`
	PeriodType   string     `json:"periodType" enum:"weekly,monthly,yearly,custom" doc:"Budget period type"`
	Name         string     `json:"name" doc:"Budget name" maxLength:"100"`
	Note         *string    `json:"note" doc:"Optional note for the budget" maxLength:"500"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

// BudgetsPagedModel represents a paginated list of generated budgets
// Accessible via GET /budgets/{id}/list endpoint (related budgets from template)
type BudgetsPagedModel struct {
	Items      []BudgetModel `json:"items" doc:"List of budgets"`
	PageNumber int           `json:"pageNumber" doc:"Current page number"`
	PageSize   int           `json:"pageSize" doc:"Items per page"`
	TotalCount int           `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int           `json:"totalPages" doc:"Total number of pages"`
}

// Internal models for budget generation (not exposed via API)
// Single source of truth for budget-related internal operations

type BudgetsSearchModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,templateId,accountId,categoryId,periodStart,periodEnd,amountLimit,status,name,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	IDs         []int64 `query:"id" doc:"Filter by budget IDs"`
	TemplateIDs []int64 `query:"templateId" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
	Status      string  `query:"status" enum:"active,inactive" doc:"Filter by budget status"`
	Name        string  `query:"name" doc:"Filter by budget name (partial match)"`
}

// CreateBudgetModel used by BudgetService.Create() and BudgetTemplateWorker
// Worker passes these to Create() to generate budgets from templates
type CreateBudgetModel struct {
	TemplateID  *int64      `json:"templateId,omitempty" doc:"Budget template ID if generated from template" minimum:"1"`
	AccountID   *int64      `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64      `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	PeriodStart interface{} `json:"periodStart" required:"true" doc:"Budget period start date"` // time.Time or string
	PeriodEnd   interface{} `json:"periodEnd" required:"true" doc:"Budget period end date"`     // time.Time or string
	AmountLimit int64       `json:"amountLimit" required:"true" minimum:"1" doc:"Budget limit amount in cents"`
	Name        string      `json:"name" required:"true" doc:"Budget name" maxLength:"100"`
	Note        *string     `json:"note,omitempty" doc:"Optional note for the budget" maxLength:"500"`
}

// UpdateBudgetModel used internally to update existing budgets
// Only these fields can be modified; AccountID/CategoryID cannot change
type UpdateBudgetModel struct {
	PeriodStart *interface{} `json:"periodStart,omitempty" doc:"Budget period start date"` // *time.Time or *string
	PeriodEnd   *interface{} `json:"periodEnd,omitempty" doc:"Budget period end date"`     // *time.Time or *string
	AmountLimit *int64       `json:"amountLimit,omitempty" minimum:"1" doc:"Budget limit amount in cents"`
	Status      *string      `json:"status,omitempty" enum:"active,inactive" doc:"Budget status"`
	Name        *string      `json:"name,omitempty" doc:"Budget name" maxLength:"100"`
	Note        *string      `json:"note,omitempty" doc:"Optional note for the budget" maxLength:"500"`
}
