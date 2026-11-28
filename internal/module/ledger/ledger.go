// Package ledger is the posting module: it validates an intent and writes one
// balanced entry. This file is the package's contract; service.go implements it.
package ledger

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
	"github.com/dimasbaguspm/spenicle/internal/repository/cache"
)

type Contract interface {
	Post(ctx context.Context, in PostInput) (entity.Entry, bool, error)
	List(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	Get(ctx context.Context, ref string) (entity.Entry, error)
	Reverse(ctx context.Context, ref, reason string) (entity.Entry, error)
	UpdatePayee(ctx context.Context, ref, payeeRef string) (entity.Entry, error)
	Correct(ctx context.Context, ref string, in CorrectInput) (entity.Entry, error)
	Amend(ctx context.Context, ref string, in AmendInput) (entity.Entry, error)
	Build(ctx context.Context, in PostInput) (entity.Entry, bool, error)
}

type Service struct {
	entries  repository.Ledger
	accounts AccountSource
	payees   PayeeSource
	base     BaseCurrencySource
	rates    RateSource
	clock    TimeSource
	found    *cache.Cache[string, accountResult]
	known    *cache.Cache[string, bool]
}

type BaseCurrencySource interface {
	BaseCurrency(ctx context.Context) (string, error)
}

type RateSource interface {
	Rate(ctx context.Context, base, quote string, on time.Time) (entity.Rate, bool, error)
}

type PayeeSource interface {
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
}

type AccountSource interface {
	AccountByRef(ctx context.Context, ref string) (entity.Account, bool, error)
}

type TimeSource interface{ Now() time.Time }

func New(
	entries repository.Ledger,
	accounts AccountSource,
	payees PayeeSource,
	base BaseCurrencySource,
	rates RateSource,
	clock TimeSource,
) *Service {
	return &Service{
		entries:  entries,
		accounts: accounts,
		payees:   payees,
		base:     base,
		rates:    rates,
		clock:    clock,
		found:    cache.New[string, accountResult](accountTTL, nil),
		known:    cache.New[string, bool](accountTTL, nil),
	}
}

var _ Contract = (*Service)(nil)

type CorrectInput struct {
	OccurredOn *time.Time
	Note       *string
	Postings   []PostingInput
	Reason     string
}
type PostInput struct {
	IdempotencyKey   string
	OccurredOn       time.Time
	PayeeRef         string
	Note             string
	Currency         string
	Source           string
	RecurringRuleRef string
	Postings         []PostingInput
	KnownAccounts    map[string]entity.Account
}

type PostingInput struct {
	AccountRef  string
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}
