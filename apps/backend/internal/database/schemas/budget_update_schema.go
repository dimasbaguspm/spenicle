package schemas

import (
	"time"
)

// UpdateBudgetSchema represents input for updating a budget
type UpdateBudgetSchema struct {
	TemplateID  *int64     `json:"templateId,omitempty" doc:"Budget template ID if generated from template" example:"1" minimum:"1"`
	AccountID   *int64     `json:"accountId,omitempty" doc:"Account ID to filter transactions" example:"1" minimum:"1"`
	CategoryID  *int64     `json:"categoryId,omitempty" doc:"Category ID to filter transactions" example:"5" minimum:"1"`
	PeriodStart *time.Time `json:"periodStart,omitempty" doc:"Budget period start date" format:"date-time"`
	PeriodEnd   *time.Time `json:"periodEnd,omitempty" doc:"Budget period end date" format:"date-time"`
	AmountLimit *int64     `json:"amountLimit,omitempty" doc:"Budget limit amount in cents" example:"100000" minimum:"1"`
	Note        *string    `json:"note,omitempty" doc:"Note for the budget" example:"Updated note" maxLength:"500"`
}

// HasChanges returns true if at least one field is set
func (u *UpdateBudgetSchema) HasChanges() bool {
	return u.TemplateID != nil || u.AccountID != nil || u.CategoryID != nil ||
		u.PeriodStart != nil || u.PeriodEnd != nil || u.AmountLimit != nil || u.Note != nil
}

// Validate checks business rules for updating a budget
// Takes existing budget to validate date ranges when only one date is updated
func (u *UpdateBudgetSchema) Validate(existing *BudgetSchema) error {
	// Validate date range if both are being updated
	if u.PeriodStart != nil && u.PeriodEnd != nil {
		if u.PeriodEnd.Before(*u.PeriodStart) {
			return ErrBudgetInvalidDates
		}
	}
	// Validate if only one date is updated
	if u.PeriodStart != nil && u.PeriodEnd == nil {
		if existing != nil && existing.PeriodEnd.Before(*u.PeriodStart) {
			return ErrBudgetInvalidDates
		}
	}
	if u.PeriodEnd != nil && u.PeriodStart == nil {
		if existing != nil && u.PeriodEnd.Before(existing.PeriodStart) {
			return ErrBudgetInvalidDates
		}
	}
	return nil
}
