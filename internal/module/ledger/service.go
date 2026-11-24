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

	var payeeID *int64

	if in.PayeeRef != "" {
		id, err := s.resolvePayee(ctx, in.PayeeRef)
		if err != nil {
			return entity.Entry{}, false, err
		}

		payeeID = &id
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
		ClientID:        in.ClientID,
		OccurredOn:      in.OccurredOn,
		PayeeID:         payeeID,
		Note:            in.Note,
		Currency:        nativeCurrency.Code,
		Source:          in.Source,
		Postings:        postings,
		RecurringRuleID: in.RecurringRuleID,
		CreatedAt:       s.clock.Now(),
	})
	if err != nil {
		return entity.Entry{}, false, err
	}

	saved, err := s.entries.InsertEntry(ctx, newEntry)
	if err != nil {
		return entity.Entry{}, false, err
	}

	telemetry.RecordLedgerPost(ctx, saved.Source, int64(len(saved.Postings)))

	return saved, true, nil
}

func (s *Service) buildPostings(
	ctx context.Context,
	in PostInput,
	nativeCurrency, baseCurrency entity.Currency,
) ([]entity.Posting, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.BuildPostings")
	defer endSpan()

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

func (s *Service) Get(ctx context.Context, ref string) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Get")
	defer endSpan()

	entry, found, err := s.entries.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %s", entity.ErrNotFound, ref)
	}

	return entry, nil
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

func (s *Service) UpdatePayee(ctx context.Context, ref, payeeRef string) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.UpdatePayee")
	defer endSpan()

	var payeeID *int64

	if payeeRef != "" {
		id, err := s.resolvePayee(ctx, payeeRef)
		if err != nil {
			return entity.Entry{}, err
		}

		payeeID = &id
	}

	updated, found, err := s.entries.UpdateEntryPayee(ctx, ref, payeeID)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %s", entity.ErrNotFound, ref)
	}

	return updated, nil
}

func (s *Service) Correct(ctx context.Context, ref string, in CorrectInput) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Correct")
	defer endSpan()

	original, err := s.Get(ctx, ref)
	if err != nil {
		return entity.Entry{}, err
	}

	if original.VoidedAt != nil {
		return entity.Entry{}, fmt.Errorf("%w: entry %s is voided", entity.ErrInvalidState, ref)
	}

	occurredOn := original.OccurredOn
	if in.OccurredOn != nil {
		occurredOn = *in.OccurredOn
	}

	note := original.Note
	if in.Note != nil {
		note = *in.Note
	}

	postings := in.Postings
	if len(postings) == 0 {
		postings = make([]PostingInput, 0, len(original.Postings))

		for _, posting := range original.Postings {
			postings = append(postings, PostingInput{
				AccountRef:  posting.AccountRef,
				AmountMinor: posting.AmountMinor,
				FXRate:      posting.FXRate,
				FXRateDate:  posting.FXRateDate,
			})
		}
	}

	baseCode, err := s.base.BaseCurrency(ctx)
	if err != nil {
		return entity.Entry{}, fmt.Errorf("base currency: %w", err)
	}

	nativeCurrency, err := entity.CurrencyByCode(original.Currency)
	if err != nil {
		return entity.Entry{}, err
	}

	baseCurrency, err := entity.CurrencyByCode(baseCode)
	if err != nil {
		return entity.Entry{}, err
	}

	built, err := s.buildPostings(ctx, PostInput{
		OccurredOn: occurredOn,
		Currency:   original.Currency,
		Postings:   postings,
	}, nativeCurrency, baseCurrency)
	if err != nil {
		return entity.Entry{}, err
	}

	replacement, err := entity.NewEntry(entity.Entry{
		OccurredOn: occurredOn,
		PayeeID:    original.PayeeID,
		Note:       note,
		Currency:   original.Currency,
		Source:     constant.EntrySourceAdjustment,
		Postings:   built,
	})
	if err != nil {
		return entity.Entry{}, err
	}

	reason := in.Reason
	if reason == "" {
		reason = "corrected " + ref
	}

	return s.entries.ReplaceEntry(ctx, ref, replacement, reason, s.clock.Now())
}

func (s *Service) resolvePayee(ctx context.Context, ref string) (int64, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.ResolvePayee")
	defer endSpan()

	payee, found, err := s.payees.PayeeByRef(ctx, ref)
	if err != nil {
		return 0, fmt.Errorf("payee: %w", err)
	}

	if !found {
		return 0, fmt.Errorf("%w: payee %s", entity.ErrNotFound, ref)
	}

	return payee.ID, nil
}
