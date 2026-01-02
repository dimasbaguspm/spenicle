package schemas

import "time"

// TransactionRelationSchema represents a relationship between two transactions
type TransactionRelationSchema struct {
	ID                   int       `json:"id"`
	TransactionID        int       `json:"transactionId"`
	RelatedTransactionID int       `json:"relatedTransactionId"`
	CreatedAt            time.Time `json:"createdAt"`
}

// TransactionWithRelationsSchema extends TransactionSchema with related transactions
type TransactionWithRelationsSchema struct {
	TransactionSchema
	RelatedTransactions []TransactionSchema `json:"relatedTransactions"`
}
