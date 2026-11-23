package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) EnsureBaseline(ctx context.Context, baseCurrency, fingerprint string) (string, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EnsureBaseline")
	defer endSpan()

	if _, err := entity.CurrencyByCode(baseCurrency); err != nil {
		return "", err
	}

	if err := s.ensureFingerprint(ctx, fingerprint); err != nil {
		return "", err
	}

	if err := s.seedAccounts(ctx, baseCurrency); err != nil {
		return "", err
	}

	return baseCurrency, nil
}

func (s *Store) ensureFingerprint(ctx context.Context, fingerprint string) error {
	stored, found, err := s.Setting(ctx, constant.SettingSecretFingerprint)
	if err != nil {
		return err
	}

	if !found {
		return s.SetSetting(ctx, constant.SettingSecretFingerprint, fingerprint)
	}

	if stored == fingerprint {
		return nil
	}

	return fmt.Errorf("%w: this database was sealed with %s, APP_SECRET gives %s. "+
		"Restore the original secret, or start over with a fresh database: stop the "+
		"container, delete %q, and let the next boot migrate and seed it",
		entity.ErrSecretMismatch, stored, fingerprint, "spenicle.db")
}

type seedAccount struct {
	name string
	kind string
}

func (s *Store) seedAccounts(ctx context.Context, baseCurrency string) error {
	count, err := s.CountAccounts(ctx)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	seeds := []seedAccount{
		{name: constant.SeedAssetAccount, kind: constant.AccountKindAsset},
		{name: constant.SeedExpenseAccount, kind: constant.AccountKindExpense},
	}

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		for _, seed := range seeds {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO accounts (ref, name, kind, parent_id, currency, icon, archived_at, created_at)
				VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?)`,
				entity.NewRef(),
				seed.name,
				seed.kind,
				baseCurrency,
				time.Now().UTC().Format(constant.TimestampLayout),
			); err != nil {
				return fmt.Errorf("seed account %q: %w", seed.name, err)
			}
		}

		return nil
	})
}
