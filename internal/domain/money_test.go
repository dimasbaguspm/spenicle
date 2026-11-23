package domain_test

import (
	"errors"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/domain"
)

func TestConvertBase(t *testing.T) {
	usd, _ := domain.CurrencyByCode("USD")
	idr, _ := domain.CurrencyByCode("IDR")

	rate, err := domain.ParseRate("16250.42")
	if err != nil {
		t.Fatalf("parse rate: %v", err)
	}

	// 8.00 USD (800 cents) at 16,250.42 -> 130,003 IDR (0 minor units).
	got, err := domain.ConvertBase(800, usd, idr, rate)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if want := int64(130_003); got != want {
		t.Fatalf("got %d, want %d", got, want)
	}
}

func TestConvertBaseRoundsHalfAwayFromZero(t *testing.T) {
	usd, _ := domain.CurrencyByCode("USD")
	idr, _ := domain.CurrencyByCode("IDR")

	half, _ := domain.ParseRate("50") // 1 cent * 0.01 USD * 50 = 0.5 IDR
	got, err := domain.ConvertBase(1, usd, idr, half)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != 1 {
		t.Fatalf("positive half should round away from zero, got %d", got)
	}

	if _, err := domain.ConvertBase(1, usd, idr, nil); !errors.Is(err, domain.ErrInvalidRate) {
		t.Fatalf("a nil rate must be rejected, got %v", err)
	}
	if _, err := domain.ParseRate("-1"); err == nil {
		t.Fatal("a negative rate must be rejected")
	}
}

func TestConvertBaseNegativeAmount(t *testing.T) {
	usd, _ := domain.CurrencyByCode("USD")
	idr, _ := domain.CurrencyByCode("IDR")

	rate, _ := domain.ParseRate("50")
	got, err := domain.ConvertBase(-1, usd, idr, rate) // -0.5 rounds away from zero
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != -1 {
		t.Fatalf("got %d, want -1", got)
	}
}

func TestMinorUnitsAreNotAssumedToBeTwo(t *testing.T) {
	jpy, _ := domain.CurrencyByCode("JPY")
	usd, _ := domain.CurrencyByCode("USD")

	if jpy.MinorUnits != 0 || usd.MinorUnits != 2 {
		t.Fatalf("seed currencies wrong: JPY=%d USD=%d", jpy.MinorUnits, usd.MinorUnits)
	}

	rate, _ := domain.ParseRate("0.0067")                // 1 JPY in USD
	got, err := domain.ConvertBase(1000, jpy, usd, rate) // 1000 JPY -> 670 cents
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != 670 {
		t.Fatalf("got %d, want 670", got)
	}
}

func TestParseRateRejectsGarbage(t *testing.T) {
	for _, in := range []string{"", "abc", "0", "-1.2"} {
		if _, err := domain.ParseRate(in); err == nil {
			t.Fatalf("%q should be rejected", in)
		}
	}
}

func TestCurrencyByCodeIsCaseInsensitive(t *testing.T) {
	if _, err := domain.CurrencyByCode("idr"); err != nil {
		t.Fatalf("lowercase code should resolve: %v", err)
	}
	if _, err := domain.CurrencyByCode("XXX"); err == nil {
		t.Fatal("unknown code should fail")
	}
}
