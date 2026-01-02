package schemas

import "time"

// UpdateTransactionTemplateSchema represents the input for updating a transaction template
type UpdateTransactionTemplateSchema struct {
	AccountID        *int64     `json:"accountId,omitempty" minimum:"1" doc:"Account ID" example:"1"`
	CategoryID       *int64     `json:"categoryId,omitempty" minimum:"1" doc:"Category ID" example:"1"`
	Type             *string    `json:"type,omitempty" enum:"income,expense,transfer" doc:"Transaction type" example:"expense"`
	Amount           *int       `json:"amount,omitempty" minimum:"1" doc:"Amount in cents" example:"50000"`
	Description      *string    `json:"description,omitempty" maxLength:"500" doc:"Transaction description" example:"Monthly rent"`
	Recurrence       *string    `json:"recurrence,omitempty" enum:"none,daily,weekly,monthly,yearly" doc:"Recurrence pattern" example:"monthly"`
	StartDate        *time.Time `json:"startDate,omitempty" doc:"Start date" example:"2026-01-01"`
	EndDate          *time.Time `json:"endDate,omitempty" doc:"End date (optional)" example:"2026-12-31"`
	InstallmentCount *int       `json:"installmentCount,omitempty" minimum:"1" doc:"Total installments (optional)" example:"12"`
	Note             *string    `json:"note,omitempty" maxLength:"1000" doc:"Additional notes" example:"Auto-pay setup"`
}

// HasChanges returns true if at least one field is set
func (s UpdateTransactionTemplateSchema) HasChanges() bool {
	return s.AccountID != nil ||
		s.CategoryID != nil ||
		s.Type != nil ||
		s.Amount != nil ||
		s.Description != nil ||
		s.Recurrence != nil ||
		s.StartDate != nil ||
		s.EndDate != nil ||
		s.InstallmentCount != nil ||
		s.Note != nil
}
