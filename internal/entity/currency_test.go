package entity_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestCurrencyTableCoversISO4217(t *testing.T) {
	tests := []struct {
		code  string
		units int32
		want  bool
	}{
		{code: "USD", units: 2, want: true},
		{code: "IDR", units: 0, want: true},
		{code: "JPY", units: 0, want: true},
		{code: "ISK", units: 0, want: true},
		{code: "BHD", units: 3, want: true},
		{code: "KWD", units: 3, want: true},
		{code: "TND", units: 3, want: true},
		{code: "CLF", units: 4, want: true},
		{code: "UYW", units: 4, want: true},
		{code: "CHF", units: 2, want: true},
		{code: "XAU", units: 0, want: true},
		{code: "XXX", want: false},
		{code: "ZZZ", want: false},
	}

	for _, test := range tests {
		t.Run(test.code, func(t *testing.T) {
			currency, err := entity.CurrencyByCode(test.code)
			if !test.want {
				if err == nil {
					t.Fatalf("CurrencyByCode(%q) = %+v, want an error", test.code, currency)
				}

				return
			}

			if err != nil {
				t.Fatalf("CurrencyByCode(%q) failed: %v", test.code, err)
			}

			if currency.MinorUnits != test.units {
				t.Fatalf("CurrencyByCode(%q).MinorUnits = %d, want %d", test.code, currency.MinorUnits, test.units)
			}
		})
	}
}

func TestCurrencyTableIsTheWholeStandard(t *testing.T) {
	currencies := entity.Currencies()

	if len(currencies) < 170 {
		t.Fatalf("the table holds %d codes, want the ISO 4217 set (170 or more)", len(currencies))
	}

	for index := 1; index < len(currencies); index++ {
		if currencies[index-1].Code >= currencies[index].Code {
			t.Fatalf("the table is not sorted at %d: %q then %q",
				index, currencies[index-1].Code, currencies[index].Code)
		}
	}
}
