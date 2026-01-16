package models

import "time"

type TransactionRelationModel struct {
	ID                   int64      `json:"id" doc:"Unique identifier"`
	SourceTransactionID  int64      `json:"sourceTransactionId" doc:"ID of the source transaction"`
	RelatedTransactionID int64      `json:"relatedTransactionId" doc:"ID of the related transaction"`
	RelationType         string     `json:"relationType" doc:"Type of relation"`
	CreatedAt            time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt            time.Time  `json:"updatedAt" doc:"Last update timestamp" format:"date-time" `
	DeletedAt            *time.Time `json:"deletedAt" doc:"Deletion timestamp" format:"date-time"`
}

type TransactionRelationsSearchModel struct {
	SourceTransactionID int64 `path:"sourceTransactionId" minimum:"1" doc:"Source transaction ID to list relations for"`
	PageNumber          int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize            int   `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Number of items per page"`
}

type TransactionRelationsPagedModel struct {
	Items      []TransactionRelationModel `json:"items" doc:"List of transaction relations"`
	PageNumber int                        `json:"pageNumber" doc:"Current page number"`
	PageSize   int                        `json:"pageSize" doc:"Items per page"`
	TotalCount int                        `json:"totalCount" doc:"Total number of matching items"`
	TotalPages int                        `json:"totalPages" doc:"Total number of pages"`
}

type TransactionRelationGetModel struct {
	SourceTransactionID int64 `path:"sourceTransactionId" minimum:"1" doc:"Source transaction ID"`
	RelationID          int64 `path:"relationId" minimum:"1" doc:"Relation ID"`
}

type CreateTransactionRelationModel struct {
	SourceTransactionID  int64  `path:"sourceTransactionId" required:"true" minimum:"1" doc:"ID of the source transaction"`
	RelatedTransactionID int64  `json:"relatedTransactionId" required:"true" minimum:"1" doc:"ID of the related transaction"`
	RelationType         string `json:"relationType" required:"true" doc:"Type of relation"`
}

type DeleteTransactionRelationModel struct {
	SourceTransactionID int64 `path:"sourceTransactionId" minimum:"1" doc:"ID of the source transaction"`
	RelationID          int64 `path:"relationId" minimum:"1" doc:"ID of the relation to delete"`
}
