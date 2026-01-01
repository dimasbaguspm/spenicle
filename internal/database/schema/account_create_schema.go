package schema

// CreateAccountSchema represents the schema for creating a new account
type CreateAccountSchema struct {
	Name   string `json:"name" validate:"required" doc:"Name of the account" example:"Salary" minLength:"1" maxLength:"255"`
	Type   string `json:"type" validate:"required,oneof=expense income" doc:"Type of account" enum:"expense,income" example:"income"`
	Note   string `json:"note" validate:"omitempty" doc:"Optional note for the account" example:"Monthly salary" maxLength:"1000"`
	Amount int64  `json:"amount" validate:"gte=0" doc:"Initial amount" example:"5000" minimum:"0"`
}
