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

const (
	settingBaseCurrency = "base_currency"
	settingFingerprint  = "secret_fingerprint"

	kindAsset   = "asset"
	kindExpense = "expense"

	seedAssetAccount   = "Cash"
	seedExpenseAccount = "Unsorted"
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

	locked, err := s.ensureBaseCurrency(ctx, baseCurrency)
	if err != nil {
		return "", err
	}

	if err := s.ensureFingerprint(ctx, fingerprint); err != nil {
		return "", err
	}

	if err := s.seedAccounts(ctx, locked); err != nil {
		return "", err
	}

	return locked, nil
}

// ensureBaseCurrency either claims the currency or insists on the stored one.
func (s *Service) ensureBaseCurrency(ctx context.Context, baseCurrency string) (string, error) {
	existing, found, err := s.health.Setting(ctx, settingBaseCurrency)
	if err != nil {
		return "", err
	}

	if !found {
		if err := s.health.SetSetting(ctx, settingBaseCurrency, baseCurrency); err != nil {
			return "", err
		}

		return baseCurrency, nil
	}

	if existing != baseCurrency {
		return "", fmt.Errorf("base currency is already %s and cannot change to %s", existing, baseCurrency)
	}

	return existing, nil
}

// ensureFingerprint refuses to open data sealed with a different secret.
func (s *Service) ensureFingerprint(ctx context.Context, fingerprint string) error {
	stored, found, err := s.health.Setting(ctx, settingFingerprint)
	if err != nil {
		return err
	}

	if !found {
		return s.health.SetSetting(ctx, settingFingerprint, fingerprint)
	}

	if stored != fingerprint {
		return fmt.Errorf("%w: expected %s, APP_SECRET gives %s",
			domain.ErrSecretMismatch, stored, fingerprint)
	}

	return nil
}

// seedAccounts gives a brand new database something to post against.
func (s *Service) seedAccounts(ctx context.Context, baseCurrency string) error {
	count, err := s.accounts.CountAccounts(ctx)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	if _, err := s.accounts.CreateAccount(ctx, seedAssetAccount, kindAsset, baseCurrency); err != nil {
		return errors.Join(errors.New("seed asset account"), err)
	}

	if _, err := s.accounts.CreateAccount(ctx, seedExpenseAccount, kindExpense, baseCurrency); err != nil {
		return errors.Join(errors.New("seed expense account"), err)
	}

	return nil
}
