package entity_test

import (
	"errors"
	"math"
	"math/big"
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

func TestConvertBaseRejectsUnrepresentableResults(t *testing.T) {
	usd, _ := entity.CurrencyByCode("USD")

	tests := []struct {
		name   string
		native int64
		rate   string
		want   int64
		err    error
	}{
		{name: "the ceiling is representable", native: math.MaxInt64, rate: "1", want: math.MaxInt64},
		{name: "the floor is not", native: math.MinInt64, rate: "1", err: entity.ErrInvalidAmount},
		{name: "a rate can overflow the result", native: math.MaxInt64, rate: "2", err: entity.ErrInvalidAmount},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rate, err := entity.ParseRate(test.rate)
			if err != nil {
				t.Fatalf("parse rate: %v", err)
			}

			got, err := entity.ConvertBase(test.native, usd, usd, rate)
			if test.err != nil {
				if !errors.Is(err, test.err) {
					t.Fatalf("err = %v, want %v", err, test.err)
				}

				return
			}

			if err != nil {
				t.Fatalf("convert: %v", err)
			}
			if got != test.want {
				t.Fatalf("got %d, want %d", got, test.want)
			}
		})
	}
}

func TestCheckedMinor(t *testing.T) {
	tests := []struct {
		name    string
		value   *big.Int
		want    int64
		wantErr bool
	}{
		{name: "zero", value: big.NewInt(0), want: 0},
		{name: "ceiling", value: big.NewInt(math.MaxInt64), want: math.MaxInt64},
		{name: "floor", value: big.NewInt(math.MinInt64), wantErr: true},
		{name: "outside int64", value: new(big.Int).Lsh(big.NewInt(1), 63), wantErr: true},
		{name: "nil", value: nil, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := entity.CheckedMinor(test.value)
			if test.wantErr {
				if !errors.Is(err, entity.ErrInvalidAmount) {
					t.Fatalf("err = %v, want invalid amount", err)
				}

				return
			}

			if err != nil {
				t.Fatalf("CheckedMinor: %v", err)
			}
			if got != test.want {
				t.Fatalf("CheckedMinor = %d, want %d", got, test.want)
			}
		})
	}
}

func TestNegateMinor(t *testing.T) {
	tests := []struct {
		name    string
		amount  int64
		want    int64
		wantErr bool
	}{
		{name: "zero", amount: 0, want: 0},
		{name: "ceiling", amount: math.MaxInt64, want: -math.MaxInt64},
		{name: "floor", amount: math.MinInt64, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := entity.NegateMinor(test.amount)
			if test.wantErr {
				if !errors.Is(err, entity.ErrInvalidAmount) {
					t.Fatalf("err = %v, want invalid amount", err)
				}

				return
			}

			if err != nil {
				t.Fatalf("NegateMinor: %v", err)
			}
			if got != test.want {
				t.Fatalf("NegateMinor = %d, want %d", got, test.want)
			}
		})
	}
}
