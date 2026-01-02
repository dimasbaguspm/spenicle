package schemas

import (
	"errors"
	"time"
)

var (
	ErrTransactionTemplateTypeRequired       = errors.New("transaction type is required")
	ErrTransactionTemplateAmountRequired     = errors.New("amount is required and must be positive")
	ErrTransactionTemplateAccountRequired    = errors.New("account ID is required")
	ErrTransactionTemplateCategoryRequired   = errors.New("category ID is required")
	ErrTransactionTemplateRecurrenceRequired = errors.New("recurrence is required")
	ErrTransactionTemplateStartDateRequired  = errors.New("start date is required")
	ErrTransactionTemplateInvalidRecurrence  = errors.New("invalid recurrence pattern")
	ErrTransactionTemplateInvalidType        = errors.New("invalid transaction type")
	ErrTransactionTemplateInstallmentInvalid = errors.New("installment count must be positive if provided")
	ErrTransactionTemplateEndDateBeforeStart = errors.New("end date must be after start date")
)

// CreateTransactionTemplateSchema represents the input for creating a transaction template
type CreateTransactionTemplateSchema struct {
	AccountID        int64      `json:"accountId" minimum:"1" doc:"Account ID" example:"1"`
	CategoryID       int64      `json:"categoryId" minimum:"1" doc:"Category ID" example:"1"`
	Type             string     `json:"type" enum:"income,expense,transfer" doc:"Transaction type" example:"expense"`
	Amount           int        `json:"amount" minimum:"1" doc:"Amount in cents" example:"50000"`
	Description      *string    `json:"description,omitempty" maxLength:"500" doc:"Transaction description" example:"Monthly rent"`
	Recurrence       string     `json:"recurrence" enum:"none,daily,weekly,monthly,yearly" doc:"Recurrence pattern" example:"monthly"`
	StartDate        time.Time  `json:"startDate" doc:"Start date" example:"2026-01-01"`
	EndDate          *time.Time `json:"endDate,omitempty" doc:"End date (optional)" example:"2026-12-31"`
	InstallmentCount *int       `json:"installmentCount,omitempty" minimum:"1" doc:"Total installments (optional)" example:"12"`
	Note             *string    `json:"note,omitempty" maxLength:"1000" doc:"Additional notes" example:"Auto-pay setup"`
}

// Validate checks if the create schema has valid data
func (s CreateTransactionTemplateSchema) Validate() error {
	if s.AccountID == 0 {
		return ErrTransactionTemplateAccountRequired
	}
	if s.CategoryID == 0 {
		return ErrTransactionTemplateCategoryRequired
	}
	if s.Type == "" {
		return ErrTransactionTemplateTypeRequired
	}
	if s.Type != "income" && s.Type != "expense" && s.Type != "transfer" {
		return ErrTransactionTemplateInvalidType
	}
	if s.Amount <= 0 {
		return ErrTransactionTemplateAmountRequired
	}
	if s.Recurrence == "" {
		return ErrTransactionTemplateRecurrenceRequired
	}
	if s.Recurrence != "none" && s.Recurrence != "daily" && s.Recurrence != "weekly" && s.Recurrence != "monthly" && s.Recurrence != "yearly" {
		return ErrTransactionTemplateInvalidRecurrence
	}
	if s.StartDate.IsZero() {
		return ErrTransactionTemplateStartDateRequired
	}
	if s.EndDate != nil && s.EndDate.Before(s.StartDate) {
		return ErrTransactionTemplateEndDateBeforeStart
	}
	if s.InstallmentCount != nil && *s.InstallmentCount <= 0 {
		return ErrTransactionTemplateInstallmentInvalid
	}

	return nil
}
