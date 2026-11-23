// Package domain holds entities and invariants. No imports from other layers.
package domain

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

var (
	ErrUnknownCurrency = errors.New("unknown currency")
	ErrInvalidAmount   = errors.New("invalid amount")
	ErrInvalidRate     = errors.New("invalid rate")
)

// Currency is an ISO 4217 unit. MinorUnits is never assumed to be 2.
type Currency struct {
	Code       string
	MinorUnits int32
	Symbol     string
}

// A deliberately small seed set. The full ISO 4217 list replaces this in the
// setup milestone; every lookup goes through CurrencyByCode so nothing else
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
	c, ok := currencies[strings.ToUpper(strings.TrimSpace(code))]
	if !ok {
		return Currency{}, fmt.Errorf("%w: %s", ErrUnknownCurrency, code)
	}
	return c, nil
}

// ConvertBase converts a native minor-unit amount into base minor units and
// rounds exactly once, half away from zero. rate is base units per one native
// unit, e.g. 16250.42 for USD→IDR.
func ConvertBase(native int64, from, to Currency, rate *big.Rat) (int64, error) {
	if rate == nil || rate.Sign() <= 0 {
		return 0, ErrInvalidRate
	}
	r := new(big.Rat).SetInt64(native)

	// native_minor / 10^from is the native amount. Multiply by the rate to get
	// base units, then by 10^to to get base minor units. Divide when the target
	// has fewer decimals, never the other way round.
	if d := to.MinorUnits - from.MinorUnits; d != 0 {
		exp := int64(d)
		if exp < 0 {
			exp = -exp
		}
		scale := new(big.Rat).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(exp), nil))
		if d > 0 {
			r.Mul(r, scale)
		} else {
			r.Quo(r, scale)
		}
	}

	r.Mul(r, rate)

	if !r.Num().IsInt64() && r.Num().BitLen() > 62 {
		return 0, fmt.Errorf("%w: overflow", ErrInvalidAmount)
	}
	return roundHalfAwayFromZero(r), nil
}

// ParseRate parses an exact decimal rate. Never float64.
func ParseRate(s string) (*big.Rat, error) {
	r, ok := new(big.Rat).SetString(strings.TrimSpace(s))
	if !ok || r.Sign() <= 0 {
		return nil, fmt.Errorf("%w: %q", ErrInvalidRate, s)
	}
	return r, nil
}

func roundHalfAwayFromZero(r *big.Rat) int64 {
	num := new(big.Int).Set(r.Num())
	den := new(big.Int).Set(r.Denom())

	q, rem := new(big.Int).QuoRem(num, den, new(big.Int))
	twice := new(big.Int).Abs(rem)
	twice.Lsh(twice, 1)

	if twice.Cmp(den) >= 0 {
		if num.Sign() < 0 {
			q.Sub(q, big.NewInt(1))
		} else {
			q.Add(q, big.NewInt(1))
		}
	}
	return q.Int64()
}
