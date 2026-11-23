// Package ledger holds the PostEntry use case. It depends only on ports.
package ledger

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/domain"
	"github.com/dimasbaguspm/spenicle/internal/port"
)

// Service posts entries to the book of record.
type Service struct {
	entries port.Ledger
	base    port.BaseCurrency
	clock   port.Clock
	ids     port.IDs
}

// New wires the use case.
func New(entries port.Ledger, base port.BaseCurrency, clock port.Clock, ids port.IDs) *Service {
	return &Service{entries: entries, base: base, clock: clock, ids: ids}
}

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

// PostingInput carries native amounts only. Base amounts are derived here so
// that a client can never assert its own conversion.
type PostingInput struct {
	AccountID   int64
	AmountMinor int64
	FXRate      string
	FXRateDate  string
}

// Post validates and writes one entry. created is false when the client id had
// already been posted, in which case the stored entry is returned untouched and
// the transport answers 200 instead of 201.
func (s *Service) Post(ctx context.Context, in PostInput) (domain.Entry, bool, error) {
	if in.ClientID != "" {
		existing, found, lookupErr := s.entries.EntryByClientID(ctx, in.ClientID)
		if lookupErr != nil {
			return domain.Entry{}, false, lookupErr
		}

		if found {
			return existing, false, nil
		}
	}

	baseCode, err := s.base.Code(ctx)
	if err != nil {
		return domain.Entry{}, false, fmt.Errorf("base currency: %w", err)
	}

	nativeCur, err := domain.CurrencyByCode(in.Currency)
	if err != nil {
		return domain.Entry{}, false, err
	}

	baseCur, err := domain.CurrencyByCode(baseCode)
	if err != nil {
		return domain.Entry{}, false, err
	}

	postings, err := buildPostings(in, nativeCur, baseCur)
	if err != nil {
		return domain.Entry{}, false, err
	}

	newEntry, err := domain.NewEntry(domain.Entry{
		ClientID:   in.ClientID,
		OccurredOn: in.OccurredOn,
		PayeeID:    in.PayeeID,
		Note:       in.Note,
		Currency:   nativeCur.Code,
		Source:     in.Source,
		Postings:   postings,
		CreatedAt:  s.clock.Now(),
	})
	if err != nil {
		return domain.Entry{}, false, err
	}

	saved, err := s.entries.InsertEntry(ctx, newEntry)
	if err != nil {
		return domain.Entry{}, false, err
	}

	return saved, true, nil
}

func buildPostings(in PostInput, native, base domain.Currency) ([]domain.Posting, error) {
	postings := make([]domain.Posting, 0, len(in.Postings))

	for index, input := range in.Postings {
		posting := domain.Posting{
			AccountID:   input.AccountID,
			AmountMinor: input.AmountMinor,
			FXRateDate:  input.FXRateDate,
		}

		switch {
		case native.Code == base.Code:
			posting.BaseAmountMinor = input.AmountMinor
			posting.FXRate = "1"
			posting.FXSource = domain.FXIdentity

		case input.FXRate != "":
			rate, err := domain.ParseRate(input.FXRate)
			if err != nil {
				return nil, fmt.Errorf("posting %d: %w", index, err)
			}

			baseAmount, err := domain.ConvertBase(input.AmountMinor, native, base, rate)
			if err != nil {
				return nil, fmt.Errorf("posting %d: %w", index, err)
			}

			posting.BaseAmountMinor = baseAmount
			posting.FXRate = input.FXRate
			posting.FXSource = domain.FXManual

		default:
			// The ECB resolver lands in the FX milestone. Until then a foreign
			// entry must present its rate instead of guessing one.
			return nil, fmt.Errorf("posting %d: %w: rate required for %s to %s",
				index, domain.ErrInvalidRate, native.Code, base.Code)
		}

		postings = append(postings, posting)
	}

	return postings, nil
}
