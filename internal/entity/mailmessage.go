package entity

import "time"

// MailMessage is the reference a mailbox poll leaves behind: which mail became which
// capture, and how to ask the provider for it again. It carries no content — the body
// lives sealed in capture_payloads.raw_text, the same rule artifacts follow.
type MailMessage struct {
	ID               int64
	Ref              string
	Source           string
	MessageRef       string
	ThreadRef        string
	MessageIDHeader  string
	ProviderRevision string
	ReceivedAt       time.Time
	ObservedAt       time.Time
	CaptureID        *int64
	Status           string
	SkipReason       string
	Attempts         int
	LastError        string
	LastSyncedAt     time.Time
	SupersededBy     string
}

type MailMessageFilter struct {
	Source string
	Status string
	Cursor string
	Limit  int
}
