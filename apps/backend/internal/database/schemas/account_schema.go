package schemas

import (
	"time"
)

// AccountSchema represents the schema for an account
type AccountSchema struct {
	ID           int64      `json:"id" doc:"Unique identifier of the account" example:"1"`
	Name         string     `json:"name" doc:"Name of the account" example:"Salary"`
	Type         string     `json:"type" doc:"Type of account" enum:"expense,income" example:"income"`
	Note         string     `json:"note" doc:"Note for the account" example:"Monthly salary"`
	Amount       int64      `json:"amount" doc:"Current amount" example:"5000"`
	Icon         *string    `json:"icon,omitempty" doc:"Icon identifier set by frontend" example:"wallet-icon"`
	IconColor    *string    `json:"iconColor,omitempty" doc:"Icon color in hex format" example:"#4CAF50"`
	DisplayOrder int        `json:"displayOrder" doc:"Display order for sorting" example:"1"`
	ArchivedAt   *time.Time `json:"archivedAt,omitempty" doc:"Archive timestamp" format:"date-time"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Deletion timestamp" format:"date-time"`
}
