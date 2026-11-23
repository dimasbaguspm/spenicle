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

// ensureFingerprint refuses to open data sealed with a different secret. There is no
// in-place reset: the sealed payloads cannot be decrypted without the old key, so the
// only honest options are the old secret or a fresh database.
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

// seedAccount is one row of the first-boot chart of accounts.
type seedAccount struct {
	name string
	kind string
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

	seeds := []seedAccount{
		{name: constant.SeedAssetAccount, kind: constant.AccountKindAsset},
		{name: constant.SeedExpenseAccount, kind: constant.AccountKindExpense},
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
