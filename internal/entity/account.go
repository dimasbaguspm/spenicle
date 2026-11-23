package entity

import "time"

type Account struct {
	ID         int64
	Name       string
	Kind       string
	ParentID   *int64
	Currency   string
	Icon       string
	ArchivedAt *time.Time
	CreatedAt  time.Time
}

type AccountBalance struct {
	Account

	BaseAmountMinor int64
}

type CaptureFilter struct {
	Status string
	Cursor int64
	Limit  int
}

type EntryFilter struct {
	From      time.Time
	To        time.Time
	AccountID *int64
	PayeeID   *int64
	Source    string
	Cursor    int64
	Limit     int
}
