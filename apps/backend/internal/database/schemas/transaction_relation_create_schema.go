package schemas

// CreateTransactionRelationSchema is the input for creating a transaction relation
type CreateTransactionRelationSchema struct {
	TransactionID        int `json:"transactionId" validate:"required" doc:"The source transaction ID" minimum:"1"`
	RelatedTransactionID int `json:"relatedTransactionId" validate:"required" doc:"The related transaction ID" minimum:"1"`
}
