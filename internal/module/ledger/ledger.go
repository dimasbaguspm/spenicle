// Package ledger is the posting module: it validates an intent and writes one
// balanced entry. This file is the package's contract; service.go implements it.
package ledger

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

// Contract is what the transport layer is allowed to call.
type Contract interface {
	Post(ctx context.Context, in PostInput) (entity.Entry, bool, error)
	List(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	// Void reverses an entry and marks it voided. Nothing is deleted.
	Void(ctx context.Context, id int64, reason string) (entity.Entry, error)
}

// Service posts entries to the book of record.
type Service struct {
	entries repository.Ledger
	base    BaseCurrencySource
	clock   TimeSource
	ids     IDSource
}

// BaseCurrencySource is the reporting currency, sourced from settings.
type BaseCurrencySource interface {
	BaseCurrency(ctx context.Context) (string, error)
}

// TimeSource and IDSource are the two ambient dependencies of this module. Both
// are satisfied by clock.System.
type (
	TimeSource interface{ Now() time.Time }
	IDSource   interface{ NewID() string }
)

// New wires the module.
func New(
	entries repository.Ledger,
	base BaseCurrencySource,
	clock TimeSource,
	ids IDSource,
) *Service {
	return &Service{entries: entries, base: base, clock: clock, ids: ids}
}

var _ Contract = (*Service)(nil)

// PostInput is the caller's intent, before validation.
type PostInput struct {
	ClientID   string
	OccurredOn time.Time
	PayeeID    *int64
	Note       string
	Currency   string
	Source     string
	Postings   []PostingInput
}

// PostingInput carries native amounts only. Base amounts are derived inside the
// module so a client can never assert its own conversion.
type PostingInput struct {
	AccountID   int64
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
