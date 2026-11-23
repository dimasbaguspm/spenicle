package domain

import (
	"fmt"
	"time"
)

// Capture kinds and statuses mirror the review queue.
const (
	CaptureShare     = "share"
	CaptureImage     = "image"
	CaptureEmail     = "email"
	CaptureStatement = "statement"
	CaptureRecurring = "recurring"
	CaptureManual    = "manual"
)

const (
	CaptureExtracting = "extracting"
	CapturePending    = "pending"
	CaptureDuplicate  = "duplicate"
	CaptureApproved   = "approved"
	CaptureRejected   = "rejected"
	CaptureFailed     = "failed"
)

var captureTransitions = map[string]map[string]bool{
	CaptureExtracting: {CapturePending: true, CaptureFailed: true},
	CaptureFailed:     {CapturePending: true, CaptureExtracting: true, CaptureRejected: true},
	CapturePending:    {CaptureApproved: true, CaptureRejected: true, CaptureDuplicate: true},
	CaptureDuplicate:  {CapturePending: true},
	CaptureApproved:   {},
	CaptureRejected:   {CapturePending: true},
}

// Capture is anything unconfirmed, from any channel. It never writes to the
// ledger on its own.
type Capture struct {
	ID              int64
	Kind            string
	Status          string
	ClientID        string
	DedupeKey       string
	BatchID         string
	ArtifactHash    string
	RawText         string
	DraftJSON       string
	ExtractionError string
	ResolvedEntryID *int64
	ResolutionNote  string
	ReceivedAt      time.Time
	ResolvedAt      *time.Time
}

// Transition validates a status change. Terminal states cannot be silently
// re-opened: rejected goes back to pending, approved never does (void the
// entry instead).
func (c Capture) Transition(to string) error {
	allowed, ok := captureTransitions[c.Status]
	if !ok {
		return fmt.Errorf("%w: unknown status %q", ErrInvalidState, c.Status)
	}

	if !allowed[to] {
		return fmt.Errorf("%w: %s to %s", ErrInvalidState, c.Status, to)
	}

	return nil
}

// IsResolved reports whether the item is out of the queue.
func (c Capture) IsResolved() bool {
	return c.Status == CaptureApproved || c.Status == CaptureRejected || c.Status == CaptureDuplicate
}
