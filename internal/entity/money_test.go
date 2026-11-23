package entity_test

import (
	"errors"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestConvertBase(t *testing.T) {
	usd, _ := entity.CurrencyByCode("USD")
	idr, _ := entity.CurrencyByCode("IDR")

	rate, err := entity.ParseRate("16250.42")
	if err != nil {
		t.Fatalf("parse rate: %v", err)
	}

	got, err := entity.ConvertBase(800, usd, idr, rate)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if want := int64(130_003); got != want {
		t.Fatalf("got %d, want %d", got, want)
	}
}

func TestConvertBaseRoundsHalfAwayFromZero(t *testing.T) {
	usd, _ := entity.CurrencyByCode("USD")
	idr, _ := entity.CurrencyByCode("IDR")

	half, _ := entity.ParseRate("50")
	got, err := entity.ConvertBase(1, usd, idr, half)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != 1 {
		t.Fatalf("positive half should round away from zero, got %d", got)
	}

	if _, err := entity.ConvertBase(1, usd, idr, nil); !errors.Is(err, entity.ErrInvalidRate) {
		t.Fatalf("a nil rate must be rejected, got %v", err)
	}
	if _, err := entity.ParseRate("-1"); err == nil {
		t.Fatal("a negative rate must be rejected")
	}
}

func TestConvertBaseNegativeAmount(t *testing.T) {
	usd, _ := entity.CurrencyByCode("USD")
	idr, _ := entity.CurrencyByCode("IDR")

	rate, _ := entity.ParseRate("50")
	got, err := entity.ConvertBase(-1, usd, idr, rate)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != -1 {
		t.Fatalf("got %d, want -1", got)
	}
}

func TestMinorUnitsAreNotAssumedToBeTwo(t *testing.T) {
	jpy, _ := entity.CurrencyByCode("JPY")
	usd, _ := entity.CurrencyByCode("USD")

	if jpy.MinorUnits != 0 || usd.MinorUnits != 2 {
		t.Fatalf("seed currencies wrong: JPY=%d USD=%d", jpy.MinorUnits, usd.MinorUnits)
	}

	rate, _ := entity.ParseRate("0.0067")
	got, err := entity.ConvertBase(1000, jpy, usd, rate)
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	if got != 670 {
		t.Fatalf("got %d, want 670", got)
	}
}

func TestParseRateRejectsGarbage(t *testing.T) {
	for _, in := range []string{"", "abc", "0", "-1.2"} {
		if _, err := entity.ParseRate(in); err == nil {
			t.Fatalf("%q should be rejected", in)
		}
	}
}

func TestCurrencyByCodeIsCaseInsensitive(t *testing.T) {
	if _, err := entity.CurrencyByCode("idr"); err != nil {
		t.Fatalf("lowercase code should resolve: %v", err)
	}
	if _, err := entity.CurrencyByCode("XXX"); err == nil {
		t.Fatal("unknown code should fail")
	}
}
