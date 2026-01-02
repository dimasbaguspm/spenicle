package schemas

import "time"

type TransactionSchema struct {
	ID         int        `json:"id"`
	Type       string     `json:"type"`
	Date       time.Time  `json:"date"`
	Amount     int        `json:"amount"`
	AccountID  int        `json:"account_id"`
	CategoryID int        `json:"category_id"`
	Note       *string    `json:"note"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty"`
}
