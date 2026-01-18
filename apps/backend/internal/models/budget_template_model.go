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
	Note           *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
	LastExecutedAt *time.Time `json:"lastExecutedAt,omitempty" doc:"Timestamp of the last execution of this template" format:"date-time"`
	NextRunAt      *time.Time `json:"nextRunAt,omitempty" doc:"Next run date for recurring budget creation" format:"date-time"`
	CreatedAt      time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt      *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt      *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp" format:"date-time"`
}

type BudgetTemplatesSearchModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,accountId,categoryId,amountLimit,recurrence,startDate,endDate,nextRunAt,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	IDs         []int64 `query:"id" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
	Recurrence  string  `query:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Filter by recurrence pattern"`
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
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
}

type UpdateBudgetTemplateModel struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	AmountLimit *int64     `json:"amountLimit,omitempty" minimum:"1" doc:"Budget limit amount in cents"`
	Recurrence  *string    `json:"recurrence,omitempty" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate   *time.Time `json:"startDate,omitempty" doc:"Start date for recurrence" format:"date-time"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
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
