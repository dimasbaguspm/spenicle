package ledger

import (
	"context"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Service) Post(ctx context.Context, in PostInput) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Post")
	defer endSpan()

	if in.ClientID != "" {
		existing, found, err := s.entries.EntryByClientID(ctx, in.ClientID)
		if err != nil {
			return entity.Entry{}, false, err
		}

		if found {
			return existing, false, nil
		}
	}

	baseCode, err := s.base.BaseCurrency(ctx)
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

	postings, err := s.buildPostings(ctx, in, nativeCurrency, baseCurrency)
	if err != nil {
		return entity.Entry{}, false, err
	}

	newEntry, err := entity.NewEntry(entity.Entry{
		ClientID:   in.ClientID,
		OccurredOn: in.OccurredOn,
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
	ctx context.Context,
	in PostInput,
	nativeCurrency, baseCurrency entity.Currency,
) ([]entity.Posting, error) {
	postings := make([]entity.Posting, 0, len(in.Postings))

	for index, input := range in.Postings {
		account, found, err := s.accounts.AccountByRef(ctx, input.AccountRef)
		if err != nil {
			return nil, err
		}

		if !found {
			return nil, fmt.Errorf("posting %d: %w: account %s",
				index, entity.ErrInvalidPostings, input.AccountRef)
		}

		posting := entity.Posting{
			AccountID:   account.ID,
			AccountRef:  account.Ref,
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
			return nil, fmt.Errorf("posting %d: %w: rate required for %s to %s",
				index, entity.ErrInvalidRate, nativeCurrency.Code, baseCurrency.Code)
		}

		postings = append(postings, posting)
	}

	return postings, nil
}

func (s *Service) List(
	ctx context.Context,
	filter entity.EntryFilter,
) ([]entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.List")
	defer endSpan()

	return s.entries.ListEntries(ctx, filter)
}

func (s *Service) Void(ctx context.Context, ref, reason string) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Void")
	defer endSpan()

	reversal, err := s.entries.VoidEntry(ctx, ref, reason, s.clock.Now())
	if err != nil {
		return entity.Entry{}, err
	}

	return reversal, nil
}
