package schemas

import "time"

// TransactionAccountSchema represents basic account information in transaction responses
type TransactionAccountSchema struct {
	ID        int64   `json:"id" doc:"Account ID" example:"1"`
	Name      string  `json:"name" doc:"Account name" example:"Cash"`
	Type      string  `json:"type" doc:"Account type" enum:"expense,income" example:"expense"`
	Amount    int64   `json:"amount" doc:"Account balance" example:"100000"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier" example:"wallet"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color" example:"#4CAF50"`
}

// TransactionCategorySchema represents basic category information in transaction responses
type TransactionCategorySchema struct {
	ID        int64   `json:"id" doc:"Category ID" example:"1"`
	Name      string  `json:"name" doc:"Category name" example:"Food"`
	Type      string  `json:"type" doc:"Category type" enum:"expense,income,transfer" example:"expense"`
	Icon      *string `json:"icon,omitempty" doc:"Icon identifier" example:"food"`
	IconColor *string `json:"iconColor,omitempty" doc:"Icon color" example:"#FF5733"`
}

// TransactionTagSchema represents basic tag information in transaction responses
type TransactionTagSchema struct {
	ID   int    `json:"id" doc:"Tag ID" example:"1"`
	Name string `json:"name" doc:"Tag name" example:"vacation"`
}

type TransactionSchema struct {
	ID                 int                       `json:"id"`
	Type               string                    `json:"type"`
	Date               time.Time                 `json:"date"`
	Amount             int                       `json:"amount"`
	Account            TransactionAccountSchema  `json:"account"`
	Category           TransactionCategorySchema `json:"category"`
	DestinationAccount *TransactionAccountSchema `json:"destinationAccount"`
	Tags               []TransactionTagSchema    `json:"tags"`
	Note               *string                   `json:"note"`
	CreatedAt          time.Time                 `json:"createdAt"`
	UpdatedAt          time.Time                 `json:"updatedAt"`
	DeletedAt          *time.Time                `json:"deletedAt,omitempty"`
	// Internal fields for DB operations (not serialized to JSON)
	AccountID            int  `json:"-"`
	CategoryID           int  `json:"-"`
	DestinationAccountID *int `json:"-"`
}
