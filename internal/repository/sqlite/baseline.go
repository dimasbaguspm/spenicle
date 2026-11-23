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

// EnsureBaseline makes a fresh database usable and refuses to open one that
// belongs to someone else: it locks the base currency, records the APP_SECRET
// fingerprint and seeds a minimal chart of accounts on an empty file.
//
// It lives in the adapter, not in a module, because it is initial state — the same
// category as the embedded migrations. The rules it enforces (a real ISO code, an
// unchanging base currency, a matching fingerprint) still come from entity.
func (s *Store) EnsureBaseline(
	ctx context.Context,
	baseCurrency, fingerprint string,
	allowReset bool,
) (string, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EnsureBaseline")
	defer endSpan()

	if _, err := entity.CurrencyByCode(baseCurrency); err != nil {
		return "", err
	}

	locked, err := s.ensureBaseCurrency(ctx, baseCurrency)
	if err != nil {
		return "", err
	}

	if err := s.ensureFingerprint(ctx, fingerprint, allowReset); err != nil {
		return "", err
	}

	if err := s.seedAccounts(ctx, locked); err != nil {
		return "", err
	}

	return locked, nil
}

// ensureBaseCurrency either claims the currency or insists on the stored one.
func (s *Store) ensureBaseCurrency(ctx context.Context, baseCurrency string) (string, error) {
	existing, found, err := s.Setting(ctx, constant.SettingBaseCurrency)
	if err != nil {
		return "", err
	}

	if !found {
		if err := s.SetSetting(ctx, constant.SettingBaseCurrency, baseCurrency); err != nil {
			return "", err
		}

		return baseCurrency, nil
	}

	if existing != baseCurrency {
		return "", fmt.Errorf("base currency is already %s and cannot change to %s", existing, baseCurrency)
	}

	return existing, nil
}

// ensureFingerprint refuses to open data sealed with a different secret, unless the
// operator explicitly asked to start over.
func (s *Store) ensureFingerprint(ctx context.Context, fingerprint string, allowReset bool) error {
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

	if !allowReset {
		return fmt.Errorf("%w: this database was sealed with %s, APP_SECRET gives %s. "+
			"Put the original secret back, or set APP_SECRET_RESET=true to start over: "+
			"every sealed capture payload is discarded, the ledger is plaintext and survives",
			entity.ErrSecretMismatch, stored, fingerprint)
	}

	return s.resetSealed(ctx, fingerprint)
}

// resetSealed is the only recovery from a changed APP_SECRET: the sealed payloads
// cannot be decrypted without the old key, so they are blanked, the reset is
// audited, and the new fingerprint is recorded — all in one transaction.
func (s *Store) resetSealed(ctx context.Context, fingerprint string) error {
	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			UPDATE captures
			SET raw_text = NULL, draft_json = NULL,
			    extraction_error = NULL, resolution_note = NULL
			WHERE raw_text IS NOT NULL OR draft_json IS NOT NULL
			   OR extraction_error IS NOT NULL OR resolution_note IS NOT NULL`); err != nil {
			return fmt.Errorf("clear sealed captures: %w", err)
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO settings (k, v) VALUES (?, ?)
			ON CONFLICT (k) DO UPDATE SET v = excluded.v`,
			constant.SettingSecretFingerprint, fingerprint); err != nil {
			return fmt.Errorf("record fingerprint: %w", err)
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO audit_log (entity_table, entity_id, action, from_json, to_json, actor, at)
			VALUES ('settings', NULL, 'secret_reset', NULL, NULL, 'user', ?)`,
			time.Now().UTC().Format(constant.TimestampLayout)); err != nil {
			return fmt.Errorf("audit secret reset: %w", err)
		}

		return nil
	})
}

// seedAccounts gives a brand new database something to post against. Both rows go
// in one transaction: half a chart of accounts is worse than none.
func (s *Store) seedAccounts(ctx context.Context, baseCurrency string) error {
	count, err := s.CountAccounts(ctx)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	seeds := []struct{ name, kind string }{
		{constant.SeedAssetAccount, constant.AccountKindAsset},
		{constant.SeedExpenseAccount, constant.AccountKindExpense},
	}

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		for _, seed := range seeds {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO accounts (name, kind, parent_id, currency, icon, archived_at, created_at)
				VALUES (?, ?, NULL, ?, NULL, NULL, ?)`,
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
