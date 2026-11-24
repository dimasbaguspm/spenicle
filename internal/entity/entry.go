package entity

import (
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

var (
	ErrInvalidPostings = errors.New("invalid postings")
	ErrZeroSum         = errors.New("postings do not sum to zero")
	ErrInvalidState    = errors.New("invalid state transition")
	ErrSecretMismatch  = errors.New("app secret mismatch")
)

var validSources = map[string]bool{
	constant.EntrySourceManual:     true,
	constant.EntrySourceShare:      true,
	constant.EntrySourceEmail:      true,
	constant.EntrySourceStatement:  true,
	constant.EntrySourceRecurring:  true,
	constant.EntrySourceAdjustment: true,
}

type Posting struct {
	AccountID       int64
	AccountRef      string
	AmountMinor     int64
	BaseAmountMinor int64
	FXRate          string
	FXRateDate      string
	FXSource        string
}

type Entry struct {
	ID              int64
	Ref             string
	ClientID        string
	OccurredOn      time.Time
	PayeeID         *int64
	Note            string
	Currency        string
	Source          string
	Postings        []Posting
	VoidedAt        *time.Time
	CreatedAt       time.Time
	ReversesID      *int64
	RecurringRuleID *int64
}

func NewEntry(entry Entry) (Entry, error) {
	if _, err := CurrencyByCode(entry.Currency); err != nil {
		return Entry{}, err
	}

	if entry.OccurredOn.IsZero() {
		return Entry{}, fmt.Errorf("%w: occurred_on is required", ErrInvalidPostings)
	}

	if len(entry.Postings) < 2 {
		return Entry{}, fmt.Errorf("%w: at least two postings are required", ErrInvalidPostings)
	}

	if entry.Source == "" {
		entry.Source = constant.EntrySourceManual
	}

	if !validSources[entry.Source] {
		return Entry{}, fmt.Errorf("%w: unknown source %q", ErrInvalidPostings, entry.Source)
	}

	for index := range entry.Postings {
		posting := &entry.Postings[index]
		if posting.AccountID == 0 {
			return Entry{}, fmt.Errorf("%w: posting %d has no account", ErrInvalidPostings, index)
		}

		if posting.FXSource == "" {
			posting.FXSource = constant.FXSourceIdentity
			posting.FXRate = "1"
		}

		if posting.rateIsMalformed() {
			return Entry{}, fmt.Errorf("%w: posting %d has a malformed rate", ErrInvalidPostings, index)
		}
	}

	if err := CheckZeroSum(entry.Postings); err != nil {
		return Entry{}, err
	}

	return entry, nil
}

func (p Posting) rateIsMalformed() bool {
	if p.FXRate == "" || p.FXRate == "1" {
		return false
	}

	_, err := ParseRate(p.FXRate)

	return err != nil
}

func CheckZeroSum(postings []Posting) error {
	native := new(big.Int)
	base := new(big.Int)

	for _, posting := range postings {
		native.Add(native, big.NewInt(posting.AmountMinor))
		base.Add(base, big.NewInt(posting.BaseAmountMinor))
	}

	if native.Sign() != 0 {
		return fmt.Errorf("%w: native sum %s", ErrZeroSum, native.String())
	}

	if base.Sign() != 0 {
		return fmt.Errorf("%w: base sum %s", ErrZeroSum, base.String())
	}

	return nil
}
