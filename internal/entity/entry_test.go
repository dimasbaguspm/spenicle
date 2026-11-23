package entity_test

import (
	"errors"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func validEntry() entity.Entry {
	return entity.Entry{
		OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
		Currency:   "IDR",
		Postings: []entity.Posting{
			{AccountID: 2, AmountMinor: 25_000, BaseAmountMinor: 25_000},
			{AccountID: 1, AmountMinor: -25_000, BaseAmountMinor: -25_000},
		},
	}
}

func TestNewEntryAcceptsBalanced(t *testing.T) {
	got, err := entity.NewEntry(validEntry())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Source != constant.EntrySourceManual {
		t.Fatalf("source default = %q, want manual", got.Source)
	}
	for _, p := range got.Postings {
		if p.FXSource != constant.FXSourceIdentity || p.FXRate != "1" {
			t.Fatalf("posting defaults not applied: %+v", p)
		}
	}
}

func TestNewEntryRejectsUnbalanced(t *testing.T) {
	e := validEntry()
	e.Postings[1].AmountMinor = -24_999

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestNewEntryRejectsUnbalancedBase(t *testing.T) {
	e := validEntry()
	e.Postings[1].BaseAmountMinor = -24_000

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrZeroSum) {
		t.Fatalf("want ErrZeroSum, got %v", err)
	}
}

func TestNewEntryRejectsSinglePosting(t *testing.T) {
	e := validEntry()
	e.Postings = e.Postings[:1]

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestNewEntryRejectsUnknownCurrency(t *testing.T) {
	e := validEntry()
	e.Currency = "XXX"

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrUnknownCurrency) {
		t.Fatalf("want ErrUnknownCurrency, got %v", err)
	}
}

func TestNewEntryRejectsMissingDate(t *testing.T) {
	e := validEntry()
	e.OccurredOn = time.Time{}

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestNewEntryRejectsMalformedRate(t *testing.T) {
	e := validEntry()
	e.Postings[0].FXSource = constant.FXSourceECB
	e.Postings[0].FXRate = "not-a-rate"

	_, err := entity.NewEntry(e)
	if !errors.Is(err, entity.ErrInvalidPostings) {
		t.Fatalf("want ErrInvalidPostings, got %v", err)
	}
}

func TestCaptureTransitions(t *testing.T) {
	pending := entity.Capture{Status: constant.CaptureStatusPending}
	if err := pending.Transition(constant.CaptureStatusApproved); err != nil {
		t.Fatalf("pending to approved should be allowed: %v", err)
	}

	approved := entity.Capture{Status: constant.CaptureStatusApproved}
	if err := approved.Transition(constant.CaptureStatusPending); !errors.Is(err, entity.ErrInvalidState) {
		t.Fatalf("approved must be terminal, got %v", err)
	}

	rejected := entity.Capture{Status: constant.CaptureStatusRejected}
	if err := rejected.Transition(constant.CaptureStatusPending); err != nil {
		t.Fatalf("rejected may be reopened: %v", err)
	}
}
