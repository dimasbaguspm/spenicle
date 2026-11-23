package domain_test

import (
	"errors"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/domain"
)

func validEntry() domain.Entry {
	return domain.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Postings: []domain.Posting{
			{AccountID: 2, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: 1, AmountMinor: -25_000, BaseAmountMinor: -25_000},
		},
	}
}

func TestNewEntryAcceptsBalanced(t *testing.T) {
	got, err := domain.NewEntry(validEntry())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Source != domain.SourceManual {
		t.Fatalf("source default = %q, want manual", got.Source)
	}
	for _, p := range got.Postings {
		if p.FXSource != domain.FXIdentity || p.FXRate != "1" {
			t.Fatalf("posting defaults not applied: %+v", p)
		}
	}
}

func TestNewEntryRejectsUnbalanced(t *testing.T) {
	e := validEntry()
	e.Postings[1].AmountMinor = -24_999

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestNewEntryRejectsUnbalancedBase(t *testing.T) {
	e := validEntry()
	e.Postings[1].BaseAmountMinor = -24_000

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestNewEntryRejectsSinglePosting(t *testing.T) {
	e := validEntry()
	e.Postings = e.Postings[:1]

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestNewEntryRejectsUnknownCurrency(t *testing.T) {
	e := validEntry()
	e.Currency = "XXX"

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrUnknownCurrency) {
		t.Fatalf("want ErrUnknownCurrency, got %v", err)
	}
}

func TestNewEntryRejectsMissingDate(t *testing.T) {
	e := validEntry()
	e.OccurredOn = time.Time{}

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestNewEntryRejectsMalformedRate(t *testing.T) {
	e := validEntry()
	e.Postings[0].FXSource = domain.FXECB
	e.Postings[0].FXRate = "not-a-rate"

	_, err := domain.NewEntry(e)
	if !errors.Is(err, domain.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestCaptureTransitions(t *testing.T) {
	pending := domain.Capture{Status: domain.CapturePending}
	if err := pending.Transition(domain.CaptureApproved); err != nil {
		t.Fatalf("pending to approved should be allowed: %v", err)
	}

	approved := domain.Capture{Status: domain.CaptureApproved}
	if err := approved.Transition(domain.CapturePending); !errors.Is(err, domain.ErrInvalidState) {
		t.Fatalf("approved must be terminal, got %v", err)
	}

	rejected := domain.Capture{Status: domain.CaptureRejected}
	if err := rejected.Transition(domain.CapturePending); err != nil {
		t.Fatalf("rejected may be reopened: %v", err)
	}
}
