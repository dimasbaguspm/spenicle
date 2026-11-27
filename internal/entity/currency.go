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

const (
	zeroMinor = "BIF CLP DJF GNF IDR ISK JPY KMF KRW PYG RWF UGX UYI VND VUV XAF XOF " +
		"XPF XAG XAU XDR XPD XPT XSU XUA"
	threeMinor = "BHD IQD JOD KWD LYD OMR TND"
	fourMinor  = "CLF UYW"

	iso4217Codes = 180
	twoMinor     = "AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BMD BND BOB BOV " +
		"BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW CNY COP COU CRC CUP CVE CZK DKK DOP DZD " +
		"EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GTQ GYD HKD HNL HTG HUF ILS INR IRR " +
		"JMD KES KGS KHR KPW KZT LAK LBP LKR LRD LSL MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR " +
		"MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD PAB PEN PGK PHP PKR PLN QAR RON RSD RUB " +
		"SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TOP TRY TTD " +
		"TWD TZS UAH USD USN UYU UZS VES WST XCD YER ZAR ZMW ZWL"
)

var symbols = map[string]string{ //nolint:gochecknoglobals // read-only table
	"AUD": "A$", "BRL": "R$", "CAD": "C$", "CHF": "CHF", "CNY": "¥", "EUR": "€",
	"GBP": "£", "IDR": "Rp", "INR": "₹", "JPY": "¥", "KRW": "₩", "KWD": "د.ك",
	"MYR": "RM", "SGD": "S$", "THB": "฿", "USD": "$", "VND": "₫",
}

var currencies = buildCurrencies()

func buildCurrencies() map[string]Currency {
	out := make(map[string]Currency, iso4217Codes)

	for code, units := range minorUnitTables() {
		out[code] = Currency{Code: code, MinorUnits: units, Symbol: symbols[code]}
	}

	return out
}

func minorUnitTables() map[string]int32 {
	out := map[string]int32{}

	for _, group := range []struct {
		codes string
		units int32
	}{
		{zeroMinor, 0},
		{twoMinor, 2},
		{threeMinor, 3},
		{fourMinor, 4},
	} {
		for _, code := range strings.Fields(group.codes) {
			out[code] = group.units
		}
	}

	return out
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
