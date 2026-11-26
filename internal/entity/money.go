package entity

import (
	"errors"
	"fmt"
	"math"
	"math/big"
	"strings"
)

var (
	ErrNotFound        = errors.New("not found")
	ErrDuplicate       = errors.New("duplicate name")
	ErrUnknownCurrency = errors.New("unknown currency")
	ErrInvalidAmount   = errors.New("invalid amount")
	ErrInvalidRate     = errors.New("invalid rate")
)

const decimalBase = 10

func ConvertBase(native int64, from, to Currency, rate *big.Rat) (int64, error) {
	if rate == nil || rate.Sign() <= 0 {
		return 0, ErrInvalidRate
	}

	rat := new(big.Rat).SetInt64(native)

	if shift := to.MinorUnits - from.MinorUnits; shift != 0 {
		exponent := int64(shift)
		if exponent < 0 {
			exponent = -exponent
		}

		scale := new(big.Rat).SetInt(
			new(big.Int).Exp(big.NewInt(decimalBase), big.NewInt(exponent), nil),
		)

		if shift > 0 {
			rat.Mul(rat, scale)
		} else {
			rat.Quo(rat, scale)
		}
	}

	rat.Mul(rat, rate)

	return roundHalfAwayFromZero(rat)
}

func ParseRate(raw string) (*big.Rat, error) {
	parsed, ok := new(big.Rat).SetString(strings.TrimSpace(raw))
	if !ok || parsed.Sign() <= 0 {
		return nil, fmt.Errorf("%w: %q", ErrInvalidRate, raw)
	}

	return parsed, nil
}

func roundHalfAwayFromZero(rat *big.Rat) (int64, error) {
	numerator := new(big.Int).Set(rat.Num())
	denominator := new(big.Int).Set(rat.Denom())

	quotient, remainder := new(big.Int).QuoRem(numerator, denominator, new(big.Int))

	twice := new(big.Int).Abs(remainder)
	twice.Lsh(twice, 1)

	if twice.Cmp(denominator) >= 0 {
		if numerator.Sign() < 0 {
			quotient.Sub(quotient, big.NewInt(1))
		} else {
			quotient.Add(quotient, big.NewInt(1))
		}
	}

	return CheckedMinor(quotient)
}

func CheckedMinor(value *big.Int) (int64, error) {
	if value == nil || !value.IsInt64() {
		return 0, fmt.Errorf("%w: outside int64", ErrInvalidAmount)
	}

	amount := value.Int64()
	if amount == math.MinInt64 {
		return 0, fmt.Errorf("%w: %d cannot be negated", ErrInvalidAmount, amount)
	}

	return amount, nil
}

func NegateMinor(amount int64) (int64, error) {
	if amount == math.MinInt64 {
		return 0, fmt.Errorf("%w: %d cannot be negated", ErrInvalidAmount, amount)
	}

	return -amount, nil
}
