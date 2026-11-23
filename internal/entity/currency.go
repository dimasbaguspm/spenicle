package entity

import (
	"fmt"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// Currency is an ISO 4217 unit. MinorUnits is never assumed to be 2.
type Currency struct {
	Code       string
	MinorUnits int32
	Symbol     string
}

// A deliberately small seed set. The full ISO 4217 list replaces this when the
// setup wizard lands; every lookup goes through CurrencyByCode so nothing else
// has to change.
var currencies = map[string]Currency{
	"IDR": {Code: "IDR", MinorUnits: 0, Symbol: "Rp"},
	"USD": {Code: "USD", MinorUnits: 2, Symbol: "$"},
	"EUR": {Code: "EUR", MinorUnits: 2, Symbol: "€"},
	"GBP": {Code: "GBP", MinorUnits: 2, Symbol: "£"},
	"SGD": {Code: "SGD", MinorUnits: 2, Symbol: "S$"},
	"MYR": {Code: "MYR", MinorUnits: 2, Symbol: "RM"},
	"AUD": {Code: "AUD", MinorUnits: 2, Symbol: "A$"},
	"JPY": {Code: "JPY", MinorUnits: 0, Symbol: "¥"},
	"KRW": {Code: "KRW", MinorUnits: 0, Symbol: "₩"},
	"KWD": {Code: "KWD", MinorUnits: 3, Symbol: "د.ك"},
	"CHF": {Code: "CHF", MinorUnits: 2, Symbol: "CHF"},
	"CNY": {Code: "CNY", MinorUnits: 2, Symbol: "¥"},
	"INR": {Code: "INR", MinorUnits: 2, Symbol: "₹"},
	"THB": {Code: "THB", MinorUnits: 2, Symbol: "฿"},
	"VND": {Code: "VND", MinorUnits: 0, Symbol: "₫"},
}

// CurrencyByCode resolves an ISO code, case-insensitively.
func CurrencyByCode(code string) (Currency, error) {
	normalised := strings.ToUpper(strings.TrimSpace(code))
	if len(normalised) != constant.ISOCodeLength {
		return Currency{}, fmt.Errorf("%w: %q", ErrUnknownCurrency, code)
	}

	found, ok := currencies[normalised]
	if !ok {
		return Currency{}, fmt.Errorf("%w: %s", ErrUnknownCurrency, code)
	}

	return found, nil
}
