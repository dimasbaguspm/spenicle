package schemas

import "time"

type UpdateTransactionSchema struct {
	Type                 *string    `json:"type,omitempty" enum:"expense,income,transfer" doc:"Transaction type" example:"expense"`
	Date                 *time.Time `json:"date,omitempty" doc:"Transaction date and time" example:"2024-01-01T10:00:00Z"`
	Amount               *int       `json:"amount,omitempty" doc:"Transaction amount" example:"50000" minimum:"1"`
	AccountID            *int       `json:"accountId,omitempty" doc:"Foreign key to accounts table (source account for transfers)" example:"1" minimum:"1"`
	CategoryID           *int       `json:"categoryId,omitempty" doc:"Foreign key to categories table" example:"1" minimum:"1"`
	DestinationAccountID *int       `json:"destinationAccountId,omitempty" doc:"Destination account for transfer transactions (required when type is transfer)" example:"2" minimum:"1"`
	Note                 *string    `json:"note,omitempty" maxLength:"1000" doc:"Optional note about the transaction" example:"Monthly groceries"`
}

func (u *UpdateTransactionSchema) HasChanges() bool {
	return u.Type != nil || u.Date != nil || u.Amount != nil || u.AccountID != nil || u.CategoryID != nil || u.DestinationAccountID != nil || u.Note != nil
}
