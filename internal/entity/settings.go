package entity

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

const DefaultTimezone = "UTC"

var (
	ErrPasswordMismatch   = errors.New("password does not match")
	ErrBaseCurrencyLocked = errors.New("base currency is locked once setup is complete")
	ErrWeakPassword       = errors.New("password must be at least 12 characters")
	ErrSetupConflict      = errors.New("setup changed while it was being saved")
	ErrTimezoneSetOnce    = errors.New("timezone is set once")
	ErrTimezoneRequired   = errors.New("timezone is required")
)

type Settings struct {
	BaseCurrency       string `json:"base_currency"`
	Timezone           string `json:"timezone"`
	PasswordHash       string `json:"password_hash,omitempty"`
	PasswordMustChange bool   `json:"password_must_change,omitempty"`
	ExtractionEnabled  bool   `json:"extraction_enabled,omitempty"`
}

func DefaultSettings() Settings {
	return Settings{BaseCurrency: "IDR", Timezone: DefaultTimezone}
}

func (s Settings) Validate() error {
	trimmed := strings.ToUpper(strings.TrimSpace(s.BaseCurrency))
	if _, err := CurrencyByCode(trimmed); err != nil {
		return err
	}

	if strings.TrimSpace(s.Timezone) == "" {
		return ErrTimezoneRequired
	}

	if _, err := time.LoadLocation(s.Timezone); err != nil {
		return fmt.Errorf("timezone %q: %w", s.Timezone, err)
	}

	return nil
}

func (s Settings) HasPassword() bool { return s.PasswordHash != "" }
