package models

import "time"

// TransactionTagModel represents a tag associated with a transaction
type TransactionTagModel struct {
	ID            int64     `json:"id" doc:"Unique identifier"`
	TransactionID int64     `json:"transactionId" doc:"ID of the transaction"`
	TagID         int64     `json:"tagId" doc:"ID of the tag"`
	TagName       string    `json:"tagName" doc:"Name of the tag"`
	CreatedAt     time.Time `json:"createdAt" doc:"Creation timestamp"`
}

// ListTransactionTagsRequestModel defines query parameters for listing transaction tags
type ListTransactionTagsRequestModel struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID to list tags for"`
	PageNumber    int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize      int   `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
}

// ListTransactionTagsResponseModel represents paginated list of transaction tags
type ListTransactionTagsResponseModel struct {
	Data       []TransactionTagModel `json:"data" doc:"List of transaction tags"`
	PageNumber int                   `json:"pageNumber" doc:"Current page number"`
	PageSize   int                   `json:"pageSize" doc:"Items per page"`
	TotalCount int                   `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                   `json:"totalPages" doc:"Total number of pages"`
}

// CreateTransactionTagRequestModel represents input for adding a tag to a transaction
type CreateTransactionTagRequestModel struct {
	TransactionID int64 `json:"transactionId" required:"true" minimum:"1" doc:"ID of the transaction"`
	TagID         int64 `json:"tagId" required:"true" minimum:"1" doc:"ID of the tag"`
}

// CreateTransactionTagResponseModel is the response when adding a tag to a transaction
type CreateTransactionTagResponseModel struct {
	TransactionTagModel
}

// GetTransactionTagResponseModel is the response for getting a single transaction tag
type GetTransactionTagResponseModel struct {
	TransactionTagModel
}

// DeleteTransactionTagResponseModel is the response for deleting a transaction tag
type DeleteTransactionTagResponseModel struct{}
