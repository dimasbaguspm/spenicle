package entity

import (
	"errors"
	"strings"
)

var (
	// ErrPasswordMismatch reports a login or a change with the wrong current password.
	ErrPasswordMismatch = errors.New("password does not match")
	// ErrBaseCurrencyLocked reports a base-currency change after entries exist.
	ErrBaseCurrencyLocked = errors.New("base currency is locked once the ledger has entries")
	// ErrWeakPassword reports a password shorter than the minimum.
	ErrWeakPassword = errors.New("password must be at least 12 characters")
)

// Settings are the things the user configures inside the app. They live in the
// settings table as one sealed JSON row, decoded here into a value: adding a knob
// means adding a field and a default, nothing else.
//
// The environment holds infrastructure (paths, ports, the secret). It must not hold
// product decisions, because those change while the process is running.
type Settings struct {
	BaseCurrency string `json:"base_currency"`
	// Password seals the login credential. Sealed with APP_SECRET, like every other
	// sensitive column: a stolen database is not a stolen password.
	Password string `json:"password,omitempty"`
	// PasswordMustChange is set on the generated first password and cleared when the
	// user picks their own.
	PasswordMustChange bool `json:"password_must_change,omitempty"`
	ExtractionEnabled  bool `json:"extraction_enabled,omitempty"`
}

// DefaultSettings is what a fresh database starts with: base currency IDR, no
// password yet (one is generated at first boot).
func DefaultSettings() Settings {
	return Settings{BaseCurrency: "IDR"}
}

// Validate rejects values that cannot be stored.
func (s Settings) Validate() error {
	trimmed := strings.ToUpper(strings.TrimSpace(s.BaseCurrency))
	if _, err := CurrencyByCode(trimmed); err != nil {
		return err
	}

	return nil
}
