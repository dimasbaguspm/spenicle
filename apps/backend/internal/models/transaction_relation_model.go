package models

import "time"

// TransactionRelationModel represents a relationship between two transactions
type TransactionRelationModel struct {
	ID                   int64     `json:"id" doc:"Unique identifier"`
	TransactionID        int64     `json:"transactionId" doc:"ID of the primary transaction"`
	RelatedTransactionID int64     `json:"relatedTransactionId" doc:"ID of the related transaction"`
	CreatedAt            time.Time `json:"createdAt" doc:"Creation timestamp"`
}

// ListTransactionRelationsRequestModel defines query parameters for listing transaction relations
type ListTransactionRelationsRequestModel struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID to list relations for"`
	PageNumber    int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize      int   `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
}

// ListTransactionRelationsResponseModel represents paginated list of transaction relations
type ListTransactionRelationsResponseModel struct {
	Data       []TransactionRelationModel `json:"data" doc:"List of transaction relations"`
	PageNumber int                        `json:"pageNumber" doc:"Current page number"`
	PageSize   int                        `json:"pageSize" doc:"Items per page"`
	TotalCount int                        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                        `json:"totalPages" doc:"Total number of pages"`
}

// CreateTransactionRelationRequestModel represents input for creating a transaction relation
type CreateTransactionRelationRequestModel struct {
	TransactionID        int64 `json:"transactionId" required:"true" minimum:"1" doc:"ID of the primary transaction"`
	RelatedTransactionID int64 `json:"relatedTransactionId" required:"true" minimum:"1" doc:"ID of the related transaction"`
}

// CreateTransactionRelationResponseModel is the response when creating a transaction relation
type CreateTransactionRelationResponseModel struct {
	TransactionRelationModel
}

// GetTransactionRelationResponseModel is the response for getting a single transaction relation
type GetTransactionRelationResponseModel struct {
	TransactionRelationModel
}

// DeleteTransactionRelationResponseModel is the response for deleting a transaction relation
type DeleteTransactionRelationResponseModel struct{}
