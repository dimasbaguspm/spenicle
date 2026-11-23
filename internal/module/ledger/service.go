package ledger

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// Post validates and writes one entry. created is false when the client id had
// already been posted, in which case the stored entry is returned untouched and
// the transport answers 200 instead of 201.
func (s *Service) Post(ctx context.Context, in PostInput) (entity.Entry, bool, error) {
	if in.ClientID != "" {
		existing, found, err := s.entries.EntryByClientID(ctx, in.ClientID)
		if err != nil {
			return entity.Entry{}, false, err
		}

		if found {
			return existing, false, nil
		}
	}

	baseCode, err := s.system.BaseCurrencyCode(ctx)
	if err != nil {
		return entity.Entry{}, false, fmt.Errorf("base currency: %w", err)
	}

	nativeCurrency, err := entity.CurrencyByCode(in.Currency)
	if err != nil {
		return entity.Entry{}, false, err
	}

	baseCurrency, err := entity.CurrencyByCode(baseCode)
	if err != nil {
		return entity.Entry{}, false, err
	}

	postings, err := s.buildPostings(in, nativeCurrency, baseCurrency)
	if err != nil {
		return entity.Entry{}, false, err
	}

	newEntry, err := entity.NewEntry(entity.Entry{
		ClientID:   in.ClientID,
		OccurredOn: in.OccurredOn,
		PayeeID:    in.PayeeID,
		Note:       in.Note,
		Currency:   nativeCurrency.Code,
		Source:     in.Source,
		Postings:   postings,
		CreatedAt:  s.clock.Now(),
	})
	if err != nil {
		return entity.Entry{}, false, err
	}

	saved, err := s.entries.InsertEntry(ctx, newEntry)
	if err != nil {
		return entity.Entry{}, false, err
	}

	return saved, true, nil
}

func (s *Service) buildPostings(
	in PostInput,
	nativeCurrency, baseCurrency entity.Currency,
) ([]entity.Posting, error) {
	postings := make([]entity.Posting, 0, len(in.Postings))

	for index, input := range in.Postings {
		posting := entity.Posting{
			AccountID:   input.AccountID,
			AmountMinor: input.AmountMinor,
			FXRateDate:  input.FXRateDate,
		}

		switch {
		case nativeCurrency.Code == baseCurrency.Code:
			posting.BaseAmountMinor = input.AmountMinor
			posting.FXRate = "1"
			posting.FXSource = constant.FXSourceIdentity

		case input.FXRate != "":
			rate, err := entity.ParseRate(input.FXRate)
			if err != nil {
				return nil, fmt.Errorf("posting %d: %w", index, err)
			}

			baseAmount, err := entity.ConvertBase(input.AmountMinor, nativeCurrency, baseCurrency, rate)
			if err != nil {
				return nil, fmt.Errorf("posting %d: %w", index, err)
			}

			posting.BaseAmountMinor = baseAmount
			posting.FXRate = input.FXRate
			posting.FXSource = constant.FXSourceManual

		default:
			// The ECB resolver lands in the FX milestone. Until then a foreign
			// entry must present its rate instead of guessing one.
			return nil, fmt.Errorf("posting %d: %w: rate required for %s to %s",
				index, entity.ErrInvalidRate, nativeCurrency.Code, baseCurrency.Code)
		}

		postings = append(postings, posting)
	}

	return postings, nil
}
