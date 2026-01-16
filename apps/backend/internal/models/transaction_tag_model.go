package models

import "time"

type TransactionTagModel struct {
	ID            int64     `json:"id" doc:"Unique identifier"`
	TransactionID int64     `json:"transactionId" doc:"ID of the transaction"`
	TagID         int64     `json:"tagId" doc:"ID of the tag"`
	TagName       string    `json:"tagName" doc:"Name of the tag"`
	CreatedAt     time.Time `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
}

type TransactionTagsSearchModel struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID to list tags for"`
	PageNumber    int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize      int   `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
}

type TransactionTagsPagedModel struct {
	Items      []TransactionTagModel `json:"items" doc:"List of transaction tags"`
	PageNumber int                   `json:"pageNumber" doc:"Current page number"`
	PageSize   int                   `json:"pageSize" doc:"Items per page"`
	TotalCount int                   `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                   `json:"totalPages" doc:"Total number of pages"`
}

type CreateTransactionTagModel struct {
	TransactionID int64 `json:"transactionId,omitempty" minimum:"1" doc:"ID of the transaction"`
	TagID         int64 `json:"tagId" required:"true" minimum:"1" doc:"ID of the tag"`
}
