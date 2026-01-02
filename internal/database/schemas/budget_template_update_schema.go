package schemas

import (
	"time"
)

// UpdateBudgetTemplateSchema represents input for updating a budget template
type UpdateBudgetTemplateSchema struct {
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5" minimum:"1"`
	AmountLimit *int64     `json:"amountLimit,omitempty" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	Recurrence  *string    `json:"recurrence,omitempty" doc:"Recurrence pattern" enum:"none,weekly,monthly,yearly" example:"monthly"`
	StartDate   *time.Time `json:"startDate,omitempty" doc:"Start date for recurrence" format:"date-time"`
	EndDate     *time.Time `json:"endDate,omitempty" doc:"Optional end date for recurrence" format:"date-time"`
	Note        *string    `json:"note,omitempty" doc:"Note for the budget template" example:"Updated note" maxLength:"500"`
}

// HasChanges returns true if at least one field is set
func (u *UpdateBudgetTemplateSchema) HasChanges() bool {
	return u.AccountID != nil || u.CategoryID != nil || u.AmountLimit != nil ||
		u.Recurrence != nil || u.StartDate != nil || u.EndDate != nil || u.Note != nil
}
