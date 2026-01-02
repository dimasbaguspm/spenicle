package schemas

import (
	"time"
)

// CategorySchema represents the schema for a category
type CategorySchema struct {
	ID        int64      `json:"id" doc:"Unique identifier of the category" example:"1"`
	Name      string     `json:"name" doc:"Name of the category" example:"Food"`
	Type      string     `json:"type" doc:"Type of category" enum:"expense,income,transfer" example:"expense"`
	Note      string     `json:"note" doc:"Note for the category" example:"Groceries and dining"`
	CreatedAt time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" doc:"Deletion timestamp" format:"date-time"`
}
