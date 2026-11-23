// Package bootstrap performs the one-time checks and seeds a fresh database
// needs. It is the only place that writes settings at boot.
package bootstrap

import (
	"context"
	"errors"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

// spanPrefix names every bootstrap call Module.Bootstrap.<method>.
const spanPrefix = "Module.Bootstrap."

// startSpan is the single place this package spells its span names.
func startSpan(ctx context.Context, method string) (context.Context, func()) {
	return telemetry.StartSpan(ctx, spanPrefix+method)
}

// Contract is what the process startup needs. It exists so a caller can see one
// method instead of the four repositories it touches.
type Contract interface {
	EnsureBaseline(ctx context.Context, baseCurrency, fingerprint string) (string, error)
}

// Service initialises a database, idempotently.
type Service struct {
	system   repository.System
	accounts repository.Accounts
}

// New wires the module.
func New(system repository.System, accounts repository.Accounts) *Service {
	return &Service{system: system, accounts: accounts}
}

var _ Contract = (*Service)(nil)

// EnsureBaseline locks the base currency, verifies the secret fingerprint and
// seeds a minimal chart of accounts on an empty database.
func (s *Service) EnsureBaseline(ctx context.Context, baseCurrency, fingerprint string) (string, error) {
	ctx, endSpan := startSpan(ctx, "EnsureBaseline")
	defer endSpan()

	if _, err := entity.CurrencyByCode(baseCurrency); err != nil {
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
	existing, found, err := s.system.Setting(ctx, constant.SettingBaseCurrency)
	if err != nil {
		return "", err
	}

	if !found {
		if err := s.system.SetSetting(ctx, constant.SettingBaseCurrency, baseCurrency); err != nil {
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
	stored, found, err := s.system.Setting(ctx, constant.SettingSecretFingerprint)
	if err != nil {
		return err
	}

	if !found {
		return s.system.SetSetting(ctx, constant.SettingSecretFingerprint, fingerprint)
	}

	if stored != fingerprint {
		return fmt.Errorf("%w: expected %s, APP_SECRET gives %s",
			entity.ErrSecretMismatch, stored, fingerprint)
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

	if _, err := s.accounts.CreateAccount(
		ctx, constant.SeedAssetAccount, constant.AccountKindAsset, baseCurrency,
	); err != nil {
		return errors.Join(errors.New("seed asset account"), err)
	}

	if _, err := s.accounts.CreateAccount(
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense, baseCurrency,
	); err != nil {
		return errors.Join(errors.New("seed expense account"), err)
	}

	return nil
}
