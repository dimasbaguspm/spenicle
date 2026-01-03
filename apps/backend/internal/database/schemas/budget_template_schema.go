package schemas

import (
	"time"
)

// BudgetTemplateSchema represents a recurring budget template
type BudgetTemplateSchema struct {
	ID          int64      `json:"id" doc:"Unique identifier of the budget template" example:"1"`
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5"`
	AmountLimit int64      `json:"amountLimit" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	Recurrence  string     `json:"recurrence" doc:"Recurrence pattern" enum:"none,weekly,monthly,yearly" example:"monthly"`
	StartDate   time.Time  `json:"startDate" doc:"Start date for recurrence" format:"date-time"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Note        string     `json:"note" doc:"Note for the budget template" example:"Monthly food budget" maxLength:"500"`
	CreatedAt   time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty" doc:"Deletion timestamp" format:"date-time"`
}
