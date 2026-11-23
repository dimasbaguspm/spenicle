// Package ledger is the posting module: it validates an intent and writes one
// balanced entry. This file is the package's contract; service.go implements it.
package ledger

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Contract interface {
	Post(ctx context.Context, in PostInput) (entity.Entry, bool, error)
	List(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	Void(ctx context.Context, id int64, reason string) (entity.Entry, error)
}

type Service struct {
	entries repository.Ledger
	base    BaseCurrencySource
	clock   TimeSource
	ids     IDSource
}

type BaseCurrencySource interface {
	BaseCurrency(ctx context.Context) (string, error)
}

type (
	TimeSource interface{ Now() time.Time }
	IDSource   interface{ NewID() string }
)

func New(
	entries repository.Ledger,
	base BaseCurrencySource,
	clock TimeSource,
	ids IDSource,
) *Service {
	return &Service{entries: entries, base: base, clock: clock, ids: ids}
}

var _ Contract = (*Service)(nil)

type PostInput struct {
	ClientID   string
	OccurredOn time.Time
	PayeeID    *int64
	Note       string
	Currency   string
	Source     string
	Postings   []PostingInput
}

type PostingInput struct {
	AccountID   int64
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
