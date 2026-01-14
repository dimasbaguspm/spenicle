package models

import "time"

// BudgetTemplateModel represents a recurring budget template
type BudgetTemplateModel struct {
	ID          int64      `json:"id" doc:"Unique identifier"`
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions"`
	AmountLimit int64      `json:"amountLimit" doc:"Budget limit amount in cents" minimum:"1"`
	Recurrence  string     `json:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate   time.Time  `json:"startDate" doc:"Start date for recurrence"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
	CreatedAt   time.Time  `json:"createdAt" doc:"Creation timestamp"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp"`
}

// ListBudgetTemplatesRequestModel defines query parameters for budget template listing
type ListBudgetTemplatesRequestModel struct {
	PageNumber  int     `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize    int     `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy      string  `query:"sortBy" default:"createdAt" enum:"id,accountId,categoryId,amountLimit,recurrence,startDate,endDate,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder   string  `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	IDs         []int64 `query:"id" doc:"Filter by template IDs"`
	AccountIDs  []int64 `query:"accountId" doc:"Filter by account IDs"`
	CategoryIDs []int64 `query:"categoryId" doc:"Filter by category IDs"`
	Recurrence  string  `query:"recurrence" enum:"none,weekly,monthly,yearly" doc:"Filter by recurrence pattern"`
}

// ListBudgetTemplatesResponseModel represents paginated list of budget templates
type ListBudgetTemplatesResponseModel struct {
	Data       []BudgetTemplateModel `json:"data" doc:"List of budget templates"`
	PageNumber int                   `json:"pageNumber" doc:"Current page number"`
	PageSize   int                   `json:"pageSize" doc:"Items per page"`
	TotalCount int                   `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                   `json:"totalPages" doc:"Total number of pages"`
}

// CreateBudgetTemplateRequestModel represents input for creating a budget template
type CreateBudgetTemplateRequestModel struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	AmountLimit int64      `json:"amountLimit" required:"true" minimum:"1" doc:"Budget limit amount in cents"`
	Recurrence  string     `json:"recurrence" required:"true" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate   time.Time  `json:"startDate" required:"true" doc:"Start date for recurrence"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
}

// CreateBudgetTemplateResponseModel is the response when creating a budget template
type CreateBudgetTemplateResponseModel struct {
	BudgetTemplateModel
}

// GetBudgetTemplateResponseModel is the response for getting a single budget template
type GetBudgetTemplateResponseModel struct {
	BudgetTemplateModel
}

// UpdateBudgetTemplateRequestModel represents input for updating a budget template
type UpdateBudgetTemplateRequestModel struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" minimum:"1"`
	AmountLimit *int64     `json:"amountLimit,omitempty" minimum:"1" doc:"Budget limit amount in cents"`
	Recurrence  *string    `json:"recurrence,omitempty" enum:"none,weekly,monthly,yearly" doc:"Recurrence pattern"`
	StartDate   *time.Time `json:"startDate,omitempty" doc:"Start date for recurrence"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence"`
	Note        *string    `json:"note,omitempty" doc:"Optional note for the template" maxLength:"500"`
}

// UpdateBudgetTemplateResponseModel is the response when updating a budget template
type UpdateBudgetTemplateResponseModel struct {
	BudgetTemplateModel
}

// DeleteBudgetTemplateResponseModel is the response for deleting a budget template
type DeleteBudgetTemplateResponseModel struct{}
