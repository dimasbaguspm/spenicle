// Package bootstrap performs the one-time checks and seeds a fresh database
// needs. It is the only place that writes settings at boot.
package bootstrap

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/domain"
	"github.com/dimasbaguspm/spenicle/internal/port"
)

// Service initialises a database, idempotently.
type Service struct {
	health   port.Health
	accounts port.Accounts
}

// New wires the port.
func New(health port.Health, accounts port.Accounts) *Service {
	return &Service{health: health, accounts: accounts}
}

// EnsureBaseline locks the base currency, verifies the secret fingerprint and
// seeds a minimal chart of accounts on an empty database.
//
// The wizard milestone replaces the seed; until then a fresh install must be
// usable, not blank.
func (s *Service) EnsureBaseline(ctx context.Context, baseCurrency, fingerprint string) (string, error) {
	if _, err := domain.CurrencyByCode(baseCurrency); err != nil {
		return "", err
	}

	existing, ok, err := s.health.Setting(ctx, "base_currency")
	if err != nil {
		return "", err
	}
	switch {
	case !ok:
		if err := s.health.SetSetting(ctx, "base_currency", baseCurrency); err != nil {
			return "", err
		}
		existing = baseCurrency
	case existing != baseCurrency:
		return "", fmt.Errorf("base currency is already %s and cannot change to %s",
			existing, baseCurrency)
	}

	stored, ok, err := s.health.Setting(ctx, "secret_fingerprint")
	if err != nil {
		return "", err
	}
	switch {
	case !ok:
		if err := s.health.SetSetting(ctx, "secret_fingerprint", fingerprint); err != nil {
			return "", err
		}
	case stored != fingerprint:
		return "", fmt.Errorf("%w: expected %s, APP_SECRET gives %s",
			domain.ErrSecretMismatch, stored, fingerprint)
	}

	count, err := s.accounts.CountAccounts(ctx)
	if err != nil {
		return "", err
	}
	if count == 0 {
		if _, err := s.accounts.CreateAccount(ctx, "Cash", "asset", existing); err != nil {
			return "", errors.Join(errors.New("seed asset account"), err)
		}
		if _, err := s.accounts.CreateAccount(ctx, "Unsorted", "expense", existing); err != nil {
			return "", errors.Join(errors.New("seed expense account"), err)
		}
	}

	return existing, nil
}
