package entity

import "time"

type Recurring struct {
	ID               int64
	Ref              string
	PayeeRef         string
	AccountRef       string
	CategoryRef      string
	AmountMinor      int64
	Currency         string
	Cadence          string
	IntervalN        int
	DayOfMonth       int
	BusinessDayShift string
	NextDueOn        time.Time
	EndsOn           *time.Time
	Origin           string
	State            string
	LastPostedOn     *time.Time
	CreatedAt        time.Time
}
