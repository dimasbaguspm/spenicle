package schemas

import (
	"errors"
	"time"
)

var (
	ErrBudgetRequiresTarget = errors.New("budget must have at least accountId or categoryId")
	ErrBudgetInvalidDates   = errors.New("periodEnd must be after periodStart")
)

// CreateBudgetSchema represents input for creating a budget
type CreateBudgetSchema struct {
	TemplateID  *int64    `json:"templateId,omitempty" doc:"Budget template ID if generated from template" example:"1" minimum:"1"`
	AccountID   *int64    `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1" minimum:"1"`
	CategoryID  *int64    `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5" minimum:"1"`
	PeriodStart time.Time `json:"periodStart" validate:"required" doc:"Budget period start date" format:"date-time"`
	PeriodEnd   time.Time `json:"periodEnd" validate:"required" doc:"Budget period end date" format:"date-time"`
	AmountLimit int64     `json:"amountLimit" validate:"required,gte=1" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	Note        string    `json:"note" validate:"omitempty" doc:"Note for the budget" example:"January food budget" maxLength:"500"`
}

// Validate checks business rules for creating a budget
func (c *CreateBudgetSchema) Validate() error {
	// Must have at least one target (account or category)
	if c.AccountID == nil && c.CategoryID == nil {
		return ErrBudgetRequiresTarget
	}

	// periodEnd must be after periodStart
	if !c.PeriodEnd.After(c.PeriodStart) {
		return ErrBudgetInvalidDates
	}

	return nil
}
