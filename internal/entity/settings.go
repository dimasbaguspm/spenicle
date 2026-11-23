package entity

import (
	"errors"
	"strings"
)

var (
	ErrPasswordMismatch   = errors.New("password does not match")
	ErrBaseCurrencyLocked = errors.New("base currency is locked once the ledger has entries")
	ErrWeakPassword       = errors.New("password must be at least 12 characters")
)

type Settings struct {
	BaseCurrency       string `json:"base_currency"`
	Password           string `json:"password,omitempty"`
	PasswordMustChange bool   `json:"password_must_change,omitempty"`
	ExtractionEnabled  bool   `json:"extraction_enabled,omitempty"`
}

func DefaultSettings() Settings {
	return Settings{BaseCurrency: "IDR"}
}

func (s Settings) Validate() error {
	trimmed := strings.ToUpper(strings.TrimSpace(s.BaseCurrency))
	if _, err := CurrencyByCode(trimmed); err != nil {
		return err
	}

	return nil
}
