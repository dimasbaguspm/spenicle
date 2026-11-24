package ledger

import (
	"context"
	"fmt"
	"math/big"
	"time"

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

		if err := s.applyRate(ctx, &posting, input, in.OccurredOn, nativeCurrency, baseCurrency); err != nil {
			return nil, fmt.Errorf("posting %d: %w", index, err)
		}

		postings = append(postings, posting)
	}

	return postings, nil
}

func (s *Service) applyRate(
	ctx context.Context,
	posting *entity.Posting,
	input PostingInput,
	on time.Time,
	native, base entity.Currency,
) error {
	switch {
	case native.Code == base.Code:
		posting.BaseAmountMinor = input.AmountMinor
		posting.FXRate = "1"
		posting.FXSource = constant.FXSourceIdentity

		return nil
	case input.FXRate != "":
		return convertWith(posting, input, input.FXRate, constant.FXSourceManual, "", native, base)
	default:
		resolved, err := s.resolveRate(ctx, on, native.Code, base.Code)
		if err != nil {
			return err
		}

		return convertWith(posting, input, resolved.Rate, resolved.Source,
			resolved.OnDate.Format(constant.DateLayout), native, base)
	}
}

func convertWith(
	posting *entity.Posting,
	input PostingInput,
	rateText, source, rateDate string,
	native, base entity.Currency,
) error {
	rate, err := entity.ParseRate(rateText)
	if err != nil {
		return err
	}

	baseAmount, err := entity.ConvertBase(input.AmountMinor, native, base, rate)
	if err != nil {
		return err
	}

	posting.BaseAmountMinor = baseAmount
	posting.FXRate = rateText
	posting.FXSource = source

	if rateDate != "" {
		posting.FXRateDate = rateDate
	}

	return nil
}

const (
	eurCode            = "EUR"
	crossRatePrecision = 12
)

func (s *Service) resolveRate(
	ctx context.Context,
	on time.Time,
	native, base string,
) (entity.Rate, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.ResolveRate")
	defer endSpan()

	if s.rates == nil {
		return entity.Rate{}, noRate(native, base, on)
	}

	rate, found, err := s.rates.Rate(ctx, native, base, on)
	if err != nil {
		return entity.Rate{}, fmt.Errorf("rate: %w", err)
	}

	if found {
		if !sameDay(rate.OnDate, on) {
			rate.Source = constant.FXSourceCached
		}

		return rate, nil
	}

	crossed, crossedFound, err := s.crossRate(ctx, on, native, base)
	if err != nil {
		return entity.Rate{}, err
	}

	if crossedFound {
		return crossed, nil
	}

	return entity.Rate{}, noRate(native, base, on)
}

func noRate(native, base string, on time.Time) error {
	return fmt.Errorf("%w: no %s to %s rate on %s",
		entity.ErrInvalidRate, native, base, on.Format(constant.DateLayout))
}

func (s *Service) crossRate(
	ctx context.Context,
	on time.Time,
	native, base string,
) (entity.Rate, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.CrossRate")
	defer endSpan()

	toBase, found, err := s.eurPer(ctx, base, on)
	if err != nil || !found {
		return entity.Rate{}, false, err
	}

	toNative, found, err := s.eurPer(ctx, native, on)
	if err != nil || !found {
		return entity.Rate{}, false, err
	}

	numerator, err := entity.ParseRate(toBase.Rate)
	if err != nil {
		return entity.Rate{}, false, err
	}

	denominator, err := entity.ParseRate(toNative.Rate)
	if err != nil {
		return entity.Rate{}, false, err
	}

	return entity.Rate{
		Base:   native,
		Quote:  base,
		OnDate: olderDay(toBase.OnDate, toNative.OnDate),
		Rate:   new(big.Rat).Quo(numerator, denominator).FloatString(crossRatePrecision),
		Source: constant.FXSourceCached,
	}, true, nil
}

func (s *Service) eurPer(ctx context.Context, code string, on time.Time) (entity.Rate, bool, error) {
	if code == eurCode {
		return entity.Rate{
			Base:   eurCode,
			Quote:  eurCode,
			OnDate: on,
			Rate:   "1",
			Source: constant.FXSourceIdentity,
		}, true, nil
	}

	return s.rates.Rate(ctx, eurCode, code, on)
}

func sameDay(left, right time.Time) bool {
	return left.Format(constant.DateLayout) == right.Format(constant.DateLayout)
}

func olderDay(left, right time.Time) time.Time {
	if left.Before(right) {
		return left
	}

	return right
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

	nativeCurrency, baseCurrency, err := s.currencyPair(ctx, original.Currency)
	if err != nil {
		return entity.Entry{}, err
	}

	built, err := s.buildPostings(ctx, PostInput{
		OccurredOn: occurredOn,
		Currency:   original.Currency,
		Postings:   correctionPostings(original, in.Postings),
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

	return s.entries.ReplaceEntry(ctx, ref, replacement, correctionReason(in.Reason, ref), s.clock.Now())
}

func (s *Service) currencyPair(
	ctx context.Context,
	native string,
) (entity.Currency, entity.Currency, error) {
	baseCode, err := s.base.BaseCurrency(ctx)
	if err != nil {
		return entity.Currency{}, entity.Currency{}, fmt.Errorf("base currency: %w", err)
	}

	nativeCurrency, err := entity.CurrencyByCode(native)
	if err != nil {
		return entity.Currency{}, entity.Currency{}, err
	}

	baseCurrency, err := entity.CurrencyByCode(baseCode)
	if err != nil {
		return entity.Currency{}, entity.Currency{}, err
	}

	return nativeCurrency, baseCurrency, nil
}

func correctionPostings(original entity.Entry, sent []PostingInput) []PostingInput {
	if len(sent) > 0 {
		return sent
	}

	postings := make([]PostingInput, 0, len(original.Postings))

	for _, posting := range original.Postings {
		postings = append(postings, PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: posting.AmountMinor,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return postings
}

func correctionReason(reason, ref string) string {
	if reason != "" {
		return reason
	}

	return "corrected " + ref
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
