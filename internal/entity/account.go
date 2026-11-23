package entity

import "time"

type Account struct {
	ID         int64
	Ref        string
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

type AccountFilter struct {
	Query     string
	Refs      []string
	Currency  string
	Kind      string
	ParentRef string
	Archived  string
	Cursor    string
	Limit     int
}

type CaptureFilter struct {
	Status string
	Refs   []string
	Cursor string
	Limit  int
}

type EntryFilter struct {
	From       time.Time
	To         time.Time
	AccountRef string
	Source     string
	Currency   string
	Query      string
	Refs       []string
	Cursor     string
	Limit      int
}
