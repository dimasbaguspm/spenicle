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
	Get(ctx context.Context, ref string) (entity.Entry, error)
	Void(ctx context.Context, ref, reason string) (entity.Entry, error)
	UpdatePayee(ctx context.Context, ref, payeeRef string) (entity.Entry, error)
}

type Service struct {
	entries  repository.Ledger
	accounts repository.Accounts
	payees   PayeeSource
	base     BaseCurrencySource
	clock    TimeSource
	ids      IDSource
}

type BaseCurrencySource interface {
	BaseCurrency(ctx context.Context) (string, error)
}

type PayeeSource interface {
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
}

type (
	TimeSource interface{ Now() time.Time }
	IDSource   interface{ NewID() string }
)

func New(
	entries repository.Ledger,
	accounts repository.Accounts,
	payees PayeeSource,
	base BaseCurrencySource,
	clock TimeSource,
	ids IDSource,
) *Service {
	return &Service{
		entries:  entries,
		accounts: accounts,
		payees:   payees,
		base:     base,
		clock:    clock,
		ids:      ids,
	}
}

var _ Contract = (*Service)(nil)

type PostInput struct {
	ClientID        string
	OccurredOn      time.Time
	PayeeRef        string
	Note            string
	Currency        string
	Source          string
	RecurringRuleID *int64
	Postings        []PostingInput
}

type PostingInput struct {
	AccountRef  string
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
