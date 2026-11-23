package entity

import (
	"fmt"
	"sort"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type Currency struct {
	Code       string
	MinorUnits int32
	Symbol     string
}

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

func Currencies() []Currency {
	out := make([]Currency, 0, len(currencies))
	for _, currency := range currencies {
		out = append(out, currency)
	}

	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })

	return out
}

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
