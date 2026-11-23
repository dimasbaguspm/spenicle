package entity

import "time"

// Account is a row in the chart of accounts. Categories are accounts too, so one
// struct covers both pickers: `kind` decides which.
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

// AccountBalance is one account and the sum of its base postings. Balances are
// always derived from postings, never stored.
type AccountBalance struct {
	Account

	BaseAmountMinor int64
}

// CaptureFilter is what the review queue can be narrowed by.
type CaptureFilter struct {
	// Status empty means "everything unresolved first, then the rest".
	Status string
	// Cursor is the smallest id already seen; zero starts at the newest.
	Cursor int64
	Limit  int
}

// EntryFilter is what a ledger listing can be narrowed by.
type EntryFilter struct {
	From      time.Time
	To        time.Time
	AccountID *int64
	PayeeID   *int64
	Source    string
	// Cursor is the highest id already seen; zero starts at the newest.
	Cursor int64
	Limit  int
}
