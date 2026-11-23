package domain

import (
	"errors"
	"fmt"
	"math/big"
	"time"
)

var (
	ErrInvalidPostings = errors.New("invalid postings")
	ErrZeroSum         = errors.New("postings do not sum to zero")
	ErrInvalidState    = errors.New("invalid state transition")
	ErrSecretMismatch  = errors.New("app secret mismatch")
)

// Entry sources. Provenance is part of the record, not a log line.
const (
	SourceManual     = "manual"
	SourceShare      = "share"
	SourceEmail      = "email"
	SourceStatement  = "statement"
	SourceRecurring  = "recurring"
	SourceAdjustment = "adjustment"
)

var validSources = map[string]bool{
	SourceManual: true, SourceShare: true, SourceEmail: true,
	SourceStatement: true, SourceRecurring: true, SourceAdjustment: true,
}

// FX sources describe how a base amount was produced.
const (
	FXECB      = "ecb"
	FXCached   = "cached"
	FXManual   = "manual"
	FXIdentity = "identity"
)

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
func NewEntry(e Entry) (Entry, error) {
	if _, err := CurrencyByCode(e.Currency); err != nil {
		return Entry{}, err
	}
	if e.OccurredOn.IsZero() {
		return Entry{}, fmt.Errorf("%w: occurred_on is required", ErrInvalidPostings)
	}
	if len(e.Postings) < 2 {
		return Entry{}, fmt.Errorf("%w: at least two postings are required", ErrInvalidPostings)
	}
	if e.Source == "" {
		e.Source = SourceManual
	}
	if !validSources[e.Source] {
		return Entry{}, fmt.Errorf("%w: unknown source %q", ErrInvalidPostings, e.Source)
	}
	for i := range e.Postings {
		p := &e.Postings[i]
		if p.AccountID == 0 {
			return Entry{}, fmt.Errorf("%w: posting %d has no account", ErrInvalidPostings, i)
		}
		if p.FXSource == "" {
			p.FXSource = FXIdentity
			p.FXRate = "1"
		}
		if p.FXRatedInvalid() {
			return Entry{}, fmt.Errorf("%w: posting %d has a malformed rate", ErrInvalidPostings, i)
		}
	}
	if err := CheckZeroSum(e.Postings); err != nil {
		return Entry{}, err
	}
	return e, nil
}

// FXRatedInvalid reports a rate that cannot be parsed when one is present.
func (p Posting) FXRatedInvalid() bool {
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
	for _, p := range postings {
		native.Add(native, big.NewInt(p.AmountMinor))
		base.Add(base, big.NewInt(p.BaseAmountMinor))
	}
	if native.Sign() != 0 {
		return fmt.Errorf("%w: native sum %s", ErrZeroSum, native.String())
	}
	if base.Sign() != 0 {
		return fmt.Errorf("%w: base sum %s", ErrZeroSum, base.String())
	}
	return nil
}
