// Package captures is the review queue: anything unconfirmed, from any channel.
// A capture never writes to the ledger on its own — only an explicit approval does.
// This file is the package's contract; service.go implements it.
package captures

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// Contract is what the transport layer is allowed to call.
type Contract interface {
	// Create queues one capture. created is false when the same payload arrived
	// before, in which case the stored item is returned untouched.
	Create(ctx context.Context, in CreateInput) (entity.Capture, bool, error)
	List(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	// Approve posts the ledger entry and resolves the capture, in that order and
	// only once.
	Approve(ctx context.Context, id int64, in ApproveInput) (entity.Entry, entity.Capture, error)
	Reject(ctx context.Context, id int64, reason string) (entity.Capture, error)
}

// CreateInput is one raw thing a human or a share sheet handed over.
type CreateInput struct {
	ClientID     string
	Kind         string
	RawText      string
	ArtifactHash string
	BatchID      string
	ReceivedAt   time.Time
}

// ApproveInput is the human decision: the fields they typed or confirmed.
type ApproveInput struct {
	OccurredOn time.Time
	PayeeID    *int64
	Note       string
	Currency   string
	Postings   []PostingInput
}

// PostingInput is the same shape the ledger module takes; the capture module does
// not reinterpret amounts.
type PostingInput struct {
	AccountID   int64
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
