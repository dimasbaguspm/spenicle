package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) CompleteSetup(
	ctx context.Context,
	setup entity.Setup,
	expectedSettings, settingsValue string,
) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CompleteSetup")
	defer endSpan()

	setup, err := entity.NewSetup(setup.BaseCurrency, setup.Accounts, setup.OccurredOn)
	if err != nil {
		return err
	}

	now := time.Now().UTC()

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if err := checkSetupOpen(ctx, tx); err != nil {
			return err
		}

		if err := checkSetupSettings(ctx, tx, expectedSettings); err != nil {
			return err
		}

		if err := setupAccounts(ctx, tx, setup, now); err != nil {
			return err
		}

		if err := writeSetupSettings(ctx, tx, expectedSettings, settingsValue); err != nil {
			return err
		}

		return writeSetupCompleted(ctx, tx, now)
	})
}

func setupAccounts(ctx context.Context, tx *sql.Tx, setup entity.Setup, now time.Time) error {
	if len(setup.Accounts) == 0 {
		return nil
	}

	opening := entity.OpeningAccount{
		Name: constant.OpeningAccountName, Kind: constant.AccountKindEquity, AmountMinor: 1,
	}

	contra, err := setupAccount(ctx, tx, opening, setup.BaseCurrency, now)
	if err != nil {
		return err
	}

	for _, requested := range setup.Accounts {
		account, err := setupAccount(ctx, tx, requested, setup.BaseCurrency, now)
		if err != nil {
			return err
		}

		err = insertOpeningEntry(ctx, tx, setup, account, contra,
			requested.AmountMinor, now)
		if err != nil {
			return err
		}
	}

	return nil
}

func checkSetupOpen(ctx context.Context, tx *sql.Tx) error {
	var completed, hasEntries bool

	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM settings WHERE k = ?),
		       EXISTS(SELECT 1 FROM ledger_entries)`,
		constant.SettingSetupCompletedAt).Scan(&completed, &hasEntries); err != nil {
		return fmt.Errorf("check setup state: %w", err)
	}

	if completed || hasEntries {
		return entity.ErrBaseCurrencyLocked
	}

	return nil
}

func checkSetupSettings(ctx context.Context, tx *sql.Tx, expected string) error {
	stored, found, err := setupSetting(ctx, tx, constant.SettingAppSettings)
	if err != nil {
		return err
	}

	if found {
		if stored != expected {
			return entity.ErrSetupConflict
		}

		return nil
	}

	if expected != "" {
		return entity.ErrSetupConflict
	}

	return nil
}

func setupAccount(
	ctx context.Context,
	tx *sql.Tx,
	requested entity.OpeningAccount,
	currency string,
	now time.Time,
) (entity.Account, error) {
	var account entity.Account

	var archivedRaw sql.NullString

	err := tx.QueryRowContext(ctx, `
		SELECT id, ref, currency, archived_at FROM accounts WHERE name = ? AND kind = ?`,
		requested.Name, requested.Kind).
		Scan(&account.ID, &account.Ref, &account.Currency, &archivedRaw)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return entity.Account{}, fmt.Errorf("find setup account %q: %w", requested.Name, err)
	}

	account.Name = requested.Name
	account.Kind = requested.Kind

	if errors.Is(err, sql.ErrNoRows) {
		return createSetupAccount(ctx, tx, account, currency, now)
	}

	if archivedRaw.Valid {
		return entity.Account{}, fmt.Errorf("%w: account %q is archived",
			entity.ErrInvalidState, requested.Name)
	}

	if account.Currency == currency {
		return account, nil
	}

	if _, err := tx.ExecContext(ctx, `UPDATE accounts SET currency = ? WHERE ref = ?`,
		currency, account.Ref); err != nil {
		return entity.Account{}, fmt.Errorf("update setup account currency: %w", err)
	}

	if err := appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntityAccount,
		ID:     account.ID,
		Ref:    account.Ref,
		Action: constant.AuditActionUpdate,
		From: entity.AccountChanged{
			Name: account.Name, Kind: account.Kind, Currency: account.Currency,
		},
		To: entity.AccountChanged{
			Name: account.Name, Kind: account.Kind, Currency: currency,
		},
	}); err != nil {
		return entity.Account{}, err
	}

	account.Currency = currency

	return account, nil
}

func createSetupAccount(
	ctx context.Context,
	tx *sql.Tx,
	account entity.Account,
	currency string,
	now time.Time,
) (entity.Account, error) {
	account.Ref = uuid.New()
	account.Currency = currency
	account.CreatedAt = now

	result, err := tx.ExecContext(ctx, `
		INSERT INTO accounts (ref, name, kind, parent_ref, currency, icon, archived_at, created_at)
		VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?)`,
		account.Ref, account.Name, account.Kind, currency, now.Format(constant.TimestampLayout))
	if err != nil {
		return entity.Account{}, fmt.Errorf("create setup account %q: %w", account.Name, uniqueViolation(err))
	}

	account.ID, err = result.LastInsertId()
	if err != nil {
		return entity.Account{}, fmt.Errorf("setup account id: %w", err)
	}

	if err := appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntityAccount,
		ID:     account.ID,
		Ref:    account.Ref,
		Action: constant.AuditActionCreate,
		To: entity.AccountChanged{
			Name: account.Name, Kind: account.Kind, Currency: currency,
		},
	}); err != nil {
		return entity.Account{}, err
	}

	return account, nil
}

func insertOpeningEntry(
	ctx context.Context,
	tx *sql.Tx,
	setup entity.Setup,
	account, contra entity.Account,
	amount int64,
	now time.Time,
) error {
	entry, err := entity.NewEntry(entity.Entry{
		OccurredOn: setup.OccurredOn,
		Note:       constant.OpeningAccountName,
		Currency:   setup.BaseCurrency,
		Source:     constant.EntrySourceAdjustment,
		CreatedAt:  now,
		Postings: []entity.Posting{
			{
				AccountRef:  account.Ref,
				AmountMinor: amount, BaseAmountMinor: amount,
				FXRate: "1", FXSource: constant.FXSourceIdentity,
			},
			{
				AccountRef:  contra.Ref,
				AmountMinor: -amount, BaseAmountMinor: -amount,
				FXRate: "1", FXSource: constant.FXSourceIdentity,
			},
		},
	})
	if err != nil {
		return err
	}

	if sumErr := entity.CheckZeroSum(entry.Postings); sumErr != nil {
		return sumErr
	}

	entry.Ref = uuid.New()

	id, err := insertEntryRow(ctx, tx, entry, entry.Ref, now)
	if err != nil {
		return err
	}

	return appendEntryCreated(ctx, tx, entry, id, entry.Ref)
}

func setupSetting(ctx context.Context, tx *sql.Tx, key string) (string, bool, error) {
	var value string

	err := tx.QueryRowContext(ctx, `SELECT v FROM settings WHERE k = ?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf("read setup setting %q: %w", key, err)
	}

	return value, true, nil
}

func writeSetupSettings(ctx context.Context, tx *sql.Tx, expected, value string) error {
	stored, found, err := setupSetting(ctx, tx, constant.SettingAppSettings)
	if err != nil {
		return err
	}

	if !found {
		if expected != "" {
			return entity.ErrSetupConflict
		}

		if _, err := tx.ExecContext(ctx,
			`INSERT INTO settings (ref, k, v) VALUES (?, ?, ?)`,
			uuid.New(), constant.SettingAppSettings, value); err != nil {
			return fmt.Errorf("create setup settings: %w", err)
		}

		return auditSetting(ctx, tx, constant.SettingAppSettings, constant.AuditActionCreate)
	}

	if stored != expected {
		return entity.ErrSetupConflict
	}

	if _, err := tx.ExecContext(ctx, `UPDATE settings SET v = ? WHERE k = ?`,
		value, constant.SettingAppSettings); err != nil {
		return fmt.Errorf("write setup settings: %w", err)
	}

	return auditSetting(ctx, tx, constant.SettingAppSettings, constant.AuditActionUpdate)
}

func writeSetupCompleted(ctx context.Context, tx *sql.Tx, now time.Time) error {
	value := now.Format(constant.TimestampLayout)

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO settings (ref, k, v) VALUES (?, ?, ?)`,
		uuid.New(), constant.SettingSetupCompletedAt, value); err != nil {
		return fmt.Errorf("mark setup complete: %w", err)
	}

	return auditSetting(ctx, tx, constant.SettingSetupCompletedAt, constant.AuditActionCreate)
}
