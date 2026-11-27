// Package captures is the review queue: anything unconfirmed, from any channel.
// A capture never writes to the ledger on its own — only an explicit approval does.
// This file is the package's contract; service.go implements it.
package captures

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

type ArtifactStore interface {
	Put(ctx context.Context, artifact extraction.Artifact) (filestore.Record, error)
}

type ArtifactRows interface {
	InsertArtifact(ctx context.Context, artifact entity.Artifact) (entity.Artifact, error)
}

type RecurringSource interface {
	RecurringByRef(ctx context.Context, ref string) (entity.Recurring, bool, error)
}

// Queue is the half of the module the worker needs: it never posts an entry, it
// parks what a due rule expects so a human still taps approve.
type Queue interface {
	Enqueue(ctx context.Context, in EnqueueInput) (entity.Capture, bool, error)
}

type Contract interface {
	Queue
	Create(ctx context.Context, in CreateInput) (entity.Capture, bool, error)
	List(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	Approve(ctx context.Context, ref string, in ApproveInput) (entity.Entry, entity.Capture, error)
	Reject(ctx context.Context, ref, reason string) (entity.Capture, error)
	Retry(ctx context.Context, ref string) (entity.Capture, error)
}

type CreateInput struct {
	IdempotencyKey string
	Kind           string
	RawText        string
	ArtifactHash   string
	GroupLabel     string
	ReceivedAt     time.Time
	Artifact       *extraction.Artifact
}

type EnqueueInput struct {
	RuleRef     string
	OccurredOn  time.Time
	PayeeRef    string
	AccountRef  string
	CategoryRef string
	AmountMinor int64
	Currency    string
	ReceivedAt  time.Time
}

type ApproveInput struct {
	OccurredOn time.Time
	EntryRef   string
	PayeeRef   string
	Note       string
	Currency   string
	Postings   []PostingInput
}

type PostingInput struct {
	AccountRef  string
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
