package entity

import (
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

var (
	// ErrInvalidPostings reports an entry whose legs cannot be posted.
	ErrInvalidPostings = errors.New("invalid postings")
	// ErrZeroSum reports an entry whose legs do not balance.
	ErrZeroSum = errors.New("postings do not sum to zero")
	// ErrInvalidState reports a status transition that is not allowed.
	ErrInvalidState = errors.New("invalid state transition")
	// ErrSecretMismatch reports data sealed with a different APP_SECRET.
	ErrSecretMismatch = errors.New("app secret mismatch")
)

var validSources = map[string]bool{
	constant.EntrySourceManual:     true,
	constant.EntrySourceShare:      true,
	constant.EntrySourceEmail:      true,
	constant.EntrySourceStatement:  true,
	constant.EntrySourceRecurring:  true,
	constant.EntrySourceAdjustment: true,
}

// Posting is one leg. AmountMinor is in the entry currency, BaseAmountMinor in
// the base currency, and both are signed.
type Posting struct {
	AccountID       int64
	AmountMinor     int64
	BaseAmountMinor int64
	FXRate          string
	FXRateDate      string
	FXSource        string
}

// Entry is what a human says happened. The postings say where the money moved.
type Entry struct {
	ID         int64
	ClientID   string
	OccurredOn time.Time
	PayeeID    *int64
	Note       string
	Currency   string
	Source     string
	Postings   []Posting
	VoidedAt   *time.Time
	CreatedAt  time.Time
	ReversesID *int64
}

// NewEntry validates the invariants that must hold for every entry, forever.
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

// rateIsMalformed reports a rate that cannot be parsed when one is present.
func (p Posting) rateIsMalformed() bool {
	if p.FXRate == "" || p.FXRate == "1" {
		return false
	}

	_, err := ParseRate(p.FXRate)

	return err != nil
}

// CheckZeroSum is exported because the sqlite adapter re-checks it inside the
// write transaction.
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
