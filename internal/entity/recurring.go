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

type PayeeFilter struct {
	Query    string
	Refs     []string
	Archived string
	Cursor   string
	Limit    int
}

type RecurringFilter struct {
	Query   string
	Refs    []string
	State   string
	Cadence string
	Cursor  string
	Limit   int
}
