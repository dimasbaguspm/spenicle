package schemas

import "time"

type TransactionSchema struct {
	ID                   int        `json:"id"`
	Type                 string     `json:"type"`
	Date                 time.Time  `json:"date"`
	Amount               int        `json:"amount"`
	AccountID            int        `json:"accountId"`
	CategoryID           int        `json:"categoryId"`
	DestinationAccountID *int       `json:"destinationAccountId,omitempty"`
	Note                 *string    `json:"note"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	DeletedAt            *time.Time `json:"deletedAt,omitempty"`
}
