// Package captures is the review queue: anything unconfirmed, from any channel.
// A capture never writes to the ledger on its own — only an explicit approval does.
// This file is the package's contract; service.go implements it.
package captures

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

type Contract interface {
	Create(ctx context.Context, in CreateInput) (entity.Capture, bool, error)
	List(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	Approve(ctx context.Context, id int64, in ApproveInput) (entity.Entry, entity.Capture, error)
	Reject(ctx context.Context, id int64, reason string) (entity.Capture, error)
	Retry(ctx context.Context, id int64) (entity.Capture, error)
}

type CreateInput struct {
	ClientID     string
	Kind         string
	RawText      string
	ArtifactHash string
	BatchID      string
	ReceivedAt   time.Time
	Artifact     *extraction.Artifact
}

type ApproveInput struct {
	OccurredOn time.Time
	PayeeID    *int64
	Note       string
	Currency   string
	Postings   []PostingInput
}

type PostingInput struct {
	AccountID   int64
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
