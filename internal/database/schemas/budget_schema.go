package schemas

import (
	"time"
)

// BudgetSchema represents an actual budget for a specific period
type BudgetSchema struct {
	ID           int64      `json:"id" doc:"Unique identifier of the budget" example:"1"`
	TemplateID   *int64     `json:"templateId,omitempty" doc:"Budget template ID if generated from template" example:"1"`
	AccountID    *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1"`
	CategoryID   *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5"`
	PeriodStart  time.Time  `json:"periodStart" doc:"Budget period start date" format:"date-time"`
	PeriodEnd    time.Time  `json:"periodEnd" doc:"Budget period end date" format:"date-time"`
	AmountLimit  int64      `json:"amountLimit" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	ActualAmount int64      `json:"actualAmount" doc:"Actual spent amount in cents (computed from transactions)" example:"75000" minimum:"0"`
	Note         string     `json:"note" doc:"Note for the budget" example:"January food budget" maxLength:"500"`
	CreatedAt    time.Time  `json:"createdAt" doc:"Creation timestamp" format:"date-time"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" doc:"Last update timestamp" format:"date-time"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty" doc:"Deletion timestamp" format:"date-time"`
}
