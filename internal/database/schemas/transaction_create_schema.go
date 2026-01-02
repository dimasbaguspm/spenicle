package schemas

import "time"

type CreateTransactionSchema struct {
	Type       string     `json:"type" enum:"expense,income,transfer" doc:"Transaction type" example:"expense"`
	Date       *time.Time `json:"date,omitempty" doc:"Transaction date and time" example:"2024-01-01T10:00:00Z"`
	Amount     int        `json:"amount" doc:"Transaction amount" example:"50000" minimum:"1"`
	AccountID  int        `json:"accountId" doc:"Foreign key to accounts table" example:"1" minimum:"1"`
	CategoryID int        `json:"categoryId" doc:"Foreign key to categories table" example:"1" minimum:"1"`
	Note       *string    `json:"note,omitempty" maxLength:"1000" doc:"Optional note about the transaction" example:"Monthly groceries"`
}
