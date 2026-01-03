package schemas

import "time"

// TransactionTagSchema represents a transaction-tag relationship
type TransactionTagSchema struct {
	TransactionID int       `json:"transactionId"`
	TagID         int       `json:"tagId"`
	TagName       string    `json:"tagName"`
	CreatedAt     time.Time `json:"createdAt"`
}

// TransactionTagsSchema represents all tags for a transaction
type TransactionTagsSchema struct {
	TransactionID int         `json:"transactionId"`
	Tags          []TagSchema `json:"tags"`
}

// AddTransactionTagSchema is the input for adding a tag to a transaction
type AddTransactionTagSchema struct {
	TagName string `json:"tagName" maxLength:"50" minLength:"1" doc:"Tag name to add" example:"bali-2026"`
}

// UpdateTransactionTagsSchema is the input for updating all tags for a transaction
type UpdateTransactionTagsSchema struct {
	TagNames []string `json:"tagNames" maxLength:"20" doc:"Array of tag names" example:"[\"bali-2026\",\"vacation\"]"`
}

// TransactionTagParam represents path parameter for transaction tag endpoints
type TransactionTagParam struct {
	TransactionID int `path:"id" minimum:"1" doc:"Transaction ID" example:"1"`
}
