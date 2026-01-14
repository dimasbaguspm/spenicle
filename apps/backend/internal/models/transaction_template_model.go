package models

import "time"

// TransactionTemplateModel extends TransactionModel to represent a reusable transaction template
// Used for recurring or installment payments
type TransactionTemplateModel struct {
	ID                   int64                        `json:"id" doc:"Unique identifier"`
	Name                 string                       `json:"name" doc:"Template name"`
	Type                 string                       `json:"type" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               int64                        `json:"amount" doc:"Template amount"`
	AccountID            int64                        `json:"accountId" doc:"Source account ID"`
	Account              *TransactionAccountEmbedded  `json:"account,omitempty" doc:"Source account details"`
	CategoryID           int64                        `json:"categoryId" doc:"Category ID"`
	Category             *TransactionCategoryEmbedded `json:"category,omitempty" doc:"Category details"`
	DestinationAccountID *int64                       `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	DestinationAccount   *TransactionAccountEmbedded  `json:"destinationAccount,omitempty" doc:"Destination account details (transfers only)"`
	Note                 *string                      `json:"note,omitempty" doc:"Template notes"`
	CreatedAt            time.Time                    `json:"createdAt" doc:"Creation timestamp"`
	UpdatedAt            *time.Time                   `json:"updatedAt,omitempty" doc:"Last update timestamp"`
	DeletedAt            *time.Time                   `json:"deletedAt,omitempty" doc:"Soft delete timestamp"`
}

// ListTransactionTemplatesRequestModel defines query parameters for listing transaction templates
type ListTransactionTemplatesRequestModel struct {
	PageNumber int    `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize   int    `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
	SortBy     string `query:"sortBy" default:"createdAt" enum:"id,name,amount,type,createdAt,updatedAt" doc:"Field to sort by"`
	SortOrder  string `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
	Name       string `query:"name" doc:"Search by template name"`
}

// GetTransactionTemplateRequestModel defines path parameters for getting a single transaction template
type GetTransactionTemplateRequestModel struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Transaction template ID"`
}

// UpdateTransactionTemplatePathModel defines path parameters for updating a transaction template
type UpdateTransactionTemplatePathModel struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Transaction template ID"`
}

// DeleteTransactionTemplatePathModel defines path parameters for deleting a transaction template
type DeleteTransactionTemplatePathModel struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Transaction template ID"`
}

// ListTransactionTemplatesResponseModel represents paginated list of transaction templates
type ListTransactionTemplatesResponseModel struct {
	Data       []TransactionTemplateModel `json:"data" doc:"List of transaction templates"`
	PageNumber int                        `json:"pageNumber" doc:"Current page number"`
	PageSize   int                        `json:"pageSize" doc:"Items per page"`
	TotalCount int                        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                        `json:"totalPages" doc:"Total number of pages"`
}

// CreateTransactionTemplateRequestModel represents input for creating a transaction template
type CreateTransactionTemplateRequestModel struct {
	Name                 string  `json:"name" required:"true" minLength:"1" maxLength:"100" doc:"Template name"`
	Type                 string  `json:"type" required:"true" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               int64   `json:"amount" required:"true" minimum:"1" doc:"Template amount"`
	AccountID            int64   `json:"accountId" required:"true" minimum:"1" doc:"Source account ID"`
	CategoryID           int64   `json:"categoryId" required:"true" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64  `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string `json:"note,omitempty" doc:"Template notes"`
}

// CreateTransactionTemplateResponseModel is the response when creating a transaction template
type CreateTransactionTemplateResponseModel struct {
	TransactionTemplateModel
}

// GetTransactionTemplateResponseModel is the response for getting a single transaction template
type GetTransactionTemplateResponseModel struct {
	TransactionTemplateModel
}

// UpdateTransactionTemplateRequestModel represents input for updating a transaction template
type UpdateTransactionTemplateRequestModel struct {
	Name                 *string `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"Template name"`
	Type                 *string `json:"type,omitempty" minLength:"1" enum:"expense,income,transfer" doc:"Transaction type"`
	Amount               *int64  `json:"amount,omitempty" minimum:"1" doc:"Template amount"`
	AccountID            *int64  `json:"accountId,omitempty" minimum:"1" doc:"Source account ID"`
	CategoryID           *int64  `json:"categoryId,omitempty" minimum:"1" doc:"Category ID"`
	DestinationAccountID *int64  `json:"destinationAccountId,omitempty" doc:"Destination account ID (transfers only)"`
	Note                 *string `json:"note,omitempty" doc:"Template notes"`
}

// UpdateTransactionTemplateResponseModel is the response when updating a transaction template
type UpdateTransactionTemplateResponseModel struct {
	TransactionTemplateModel
}

// DeleteTransactionTemplateResponseModel is the response for deleting a transaction template
type DeleteTransactionTemplateResponseModel struct{}
