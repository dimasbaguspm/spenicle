package models

import "time"

type BudgetsSearchModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,templateId,accountId,categoryId,periodStart,periodEnd,amountLimit,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	IDs         []int64 `query:"id" doc:"Filter by budget IDs"`
	TemplateIDs []int64 `query:"templateId" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
}

type BudgetModel struct {
	ID           int64      `json:"id" doc:"Unique identifier"`
	TemplateID   *int64     `json:"templateId,omitempty" doc:"Budget template ID if generated from template"`
	AccountID    *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions"`
	CategoryID   *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions"`
	PeriodStart  time.Time  `json:"periodStart" doc:"Budget period start date" format:"date-time"`
	PeriodEnd    time.Time  `json:"periodEnd" doc:"Budget period end date" format:"date-time"`
	AmountLimit  int64      `json:"amountLimit" doc:"Budget limit amount in cents" minimum:"1"`
	ActualAmount int64      `json:"actualAmount" doc:"Actual spent amount in cents (computed from transactions)"`
	Note         *string    `json:"note,omitempty" doc:"Optional note for the budget" maxLength:"500"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type BudgetsPagedModel struct {
	Items      []BudgetModel `json:"items" doc:"List of budgets"`
	PageNumber int           `json:"pageNumber" doc:"Current page number"`
	PageSize   int           `json:"pageSize" doc:"Items per page"`
	TotalCount int           `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int           `json:"totalPages" doc:"Total number of pages"`
}

type CreateBudgetModel struct {
	TemplateID  *int64    `json:"templateId,omitempty" doc:"Budget template ID if generated from template" minimum:"1"`
	AccountID   *int64    `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64    `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	PeriodStart time.Time `json:"periodStart" required:"true" doc:"Budget period start date" format:"date-time"`
	PeriodEnd   time.Time `json:"periodEnd" required:"true" doc:"Budget period end date" format:"date-time"`
	AmountLimit int64     `json:"amountLimit" required:"true" minimum:"1" doc:"Budget limit amount in cents"`
	Note        *string   `json:"note,omitempty" doc:"Optional note for the budget" maxLength:"500"`
}

type UpdateBudgetModel struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	PeriodStart *time.Time `json:"periodStart,omitempty" doc:"Budget period start date" format:"date-time"`
	PeriodEnd   *time.Time `json:"periodEnd,omitempty" doc:"Budget period end date" format:"date-time"`
	AmountLimit *int64     `json:"amountLimit,omitempty" minimum:"1" doc:"Budget limit amount in cents"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the budget" maxLength:"500"`
}
