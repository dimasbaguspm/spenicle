package ledger

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// accountTTL is how long a resolved account or a known payee stays in memory. The
// ledger only reads those two tables, so nothing here can invalidate the cache: a
// rename shows up on the next write of the day, or within this window.
const accountTTL = time.Minute

type accountResult struct {
	account entity.Account
	found   bool
}

func (s *Service) Post(ctx context.Context, in PostInput) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Post")
	defer endSpan()

	entry, created, err := s.Build(ctx, in)
	if err != nil || !created {
		return entry, created, err
	}

	saved, err := s.entries.InsertEntry(ctx, entry)
	if err != nil {
		if !errors.Is(err, entity.ErrDuplicate) || in.IdempotencyKey == "" {
			return entity.Entry{}, false, err
		}

		existing, found, readErr := s.entries.EntryByIdempotencyKey(ctx, in.IdempotencyKey)
		if readErr != nil {
			return entity.Entry{}, false, readErr
		}

		if found {
			return existing, false, nil
		}

		return entity.Entry{}, false, err
	}

	telemetry.RecordLedgerPost(ctx, saved.Source, int64(len(saved.Postings)))

	return saved, true, nil
}

func (s *Service) Build(ctx context.Context, in PostInput) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Build")
	defer endSpan()

	if in.IdempotencyKey != "" {
		existing, found, err := s.entries.EntryByIdempotencyKey(ctx, in.IdempotencyKey)
		if err != nil {
			return entity.Entry{}, false, err
		}

		if found {
			return existing, false, nil
		}
	}

	if in.PayeeRef != "" {
		if err := s.requirePayee(ctx, in.PayeeRef); err != nil {
			return entity.Entry{}, false, err
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

	entry, err := entity.NewEntry(entity.Entry{
		IdempotencyKey:   in.IdempotencyKey,
		OccurredOn:       in.OccurredOn,
		PayeeRef:         in.PayeeRef,
		Note:             in.Note,
		Currency:         nativeCurrency.Code,
		Source:           in.Source,
		Postings:         postings,
		RecurringRuleRef: in.RecurringRuleRef,
		CreatedAt:        s.clock.Now(),
	})
	if err != nil {
		return entity.Entry{}, false, err
	}

	return entry, true, nil
}

func (s *Service) buildPostings(
	ctx context.Context,
	in PostInput,
	nativeCurrency, baseCurrency entity.Currency,
) ([]entity.Posting, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.BuildPostings")
	defer endSpan()

	postings := make([]entity.Posting, 0, len(in.Postings))
	known := make(map[string]entity.Account, len(in.Postings)+len(in.KnownAccounts))
	missing := make(map[string]bool, len(in.Postings))

	for ref, account := range in.KnownAccounts {
		known[ref] = account
	}

	for index, input := range in.Postings {
		account, found := known[input.AccountRef]
		if !found && !missing[input.AccountRef] {
			loaded, loadedFound, err := s.accountFor(ctx, input.AccountRef)
			if err != nil {
				return nil, err
			}

			found = loadedFound
			if found {
				known[input.AccountRef] = loaded
				account = loaded
			} else {
				missing[input.AccountRef] = true
			}
		}

		if !found {
			return nil, fmt.Errorf("posting %d: %w: account %s",
				index, entity.ErrInvalidPostings, input.AccountRef)
		}

		posting := entity.Posting{
			AccountRef:  account.Ref,
			AmountMinor: input.AmountMinor,
			FXRateDate:  input.FXRateDate,
		}

		if err := s.applyRate(ctx, &posting, input, in.OccurredOn, nativeCurrency, baseCurrency); err != nil {
			return nil, fmt.Errorf("posting %d: %w", index, err)
		}

		postings = append(postings, posting)
	}

	return balanceBase(postings, nativeCurrency, baseCurrency)
}

func balanceBase(postings []entity.Posting, native, base entity.Currency) ([]entity.Posting, error) {
	nativeSum := new(big.Int)
	baseSum := new(big.Int)
	largest := -1
	largestAmount := new(big.Int)

	for index, posting := range postings {
		amount := big.NewInt(posting.AmountMinor)
		nativeSum.Add(nativeSum, amount)
		baseSum.Add(baseSum, big.NewInt(posting.BaseAmountMinor))

		magnitude := new(big.Int).Abs(amount)
		if largest < 0 || magnitude.Cmp(largestAmount) > 0 {
			largest = index
			largestAmount = magnitude
		}
	}

	if nativeSum.Sign() != 0 {
		return nil, fmt.Errorf("%w: native sum %s", entity.ErrZeroSum, nativeSum.String())
	}

	if baseSum.Sign() == 0 {
		return postings, nil
	}

	if largest < 0 || native.Code == base.Code {
		return nil, fmt.Errorf("%w: cannot balance base rounding", entity.ErrInvalidPostings)
	}

	adjusted := new(big.Int).Sub(big.NewInt(postings[largest].BaseAmountMinor), baseSum)

	value, err := entity.CheckedMinor(adjusted)
	if err != nil {
		return nil, fmt.Errorf("posting %d: %w", largest, err)
	}

	postings[largest].BaseAmountMinor = value

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

func (s *Service) Reverse(ctx context.Context, ref, reason string) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.Reverse")
	defer endSpan()

	reversal, err := s.entries.ReverseEntry(ctx, ref, reason, s.clock.Now())
	if err != nil {
		return entity.Entry{}, err
	}

	return reversal, nil
}

func (s *Service) UpdatePayee(ctx context.Context, ref, payeeRef string) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.UpdatePayee")
	defer endSpan()

	if payeeRef != "" {
		if err := s.requirePayee(ctx, payeeRef); err != nil {
			return entity.Entry{}, err
		}
	}

	updated, found, err := s.entries.UpdateEntryPayee(ctx, ref, payeeRef)
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

	if original.ReversedAt != nil {
		return entity.Entry{}, fmt.Errorf("%w: entry %s is reversed", entity.ErrInvalidState, ref)
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
		PayeeRef:   original.PayeeRef,
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

func (s *Service) requirePayee(ctx context.Context, ref string) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Ledger.RequirePayee")
	defer endSpan()

	found, err := s.known.Load(ctx, ref, func(ctx context.Context) (bool, error) {
		_, known, loadErr := s.payees.PayeeByRef(ctx, ref)

		return known, loadErr
	})
	if err != nil {
		return fmt.Errorf("payee: %w", err)
	}

	if !found {
		return fmt.Errorf("%w: payee %s", entity.ErrNotFound, ref)
	}

	return nil
}

func (s *Service) accountFor(ctx context.Context, ref string) (entity.Account, bool, error) {
	result, err := s.found.Load(ctx, ref, func(ctx context.Context) (accountResult, error) {
		account, found, loadErr := s.accounts.AccountByRef(ctx, ref)

		return accountResult{account: account, found: found}, loadErr
	})

	return result.account, result.found, err
}
