package schemas

import (
	"errors"
	"time"
)

var (
	ErrBudgetTemplateRequiresTarget = errors.New("budget template must have at least accountId or categoryId")
	ErrBudgetTemplateInvalidDates   = errors.New("endDate must be after startDate")
)

// CreateBudgetTemplateSchema represents input for creating a budget template
type CreateBudgetTemplateSchema struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5" minimum:"1"`
	AmountLimit int64      `json:"amountLimit" validate:"required,gte=1" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	Recurrence  string     `json:"recurrence" validate:"required,oneof=none weekly monthly yearly" doc:"Recurrence pattern" enum:"none,weekly,monthly,yearly" example:"monthly"`
	StartDate   time.Time  `json:"startDate" validate:"required" doc:"Start date for recurrence" format:"date-time"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Note        string     `json:"note" validate:"omitempty" doc:"Note for the budget template" example:"Monthly food budget" maxLength:"500"`
}

// Validate checks business rules for creating a budget template
func (c *CreateBudgetTemplateSchema) Validate() error {
	// Must have at least one target (account or category)
	if c.AccountID == nil && c.CategoryID == nil {
		return ErrBudgetTemplateRequiresTarget
	}

	// If endDate is provided, it must be after startDate
	if c.EndDate != nil && !c.EndDate.After(c.StartDate) {
		return ErrBudgetTemplateInvalidDates
	}

	return nil
}
