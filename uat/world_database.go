package uat

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"slices"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func (w *world) useDirectoryAsDatabase() error {
	if err := w.prepare(); err != nil {
		return err
	}

	w.dbPath = w.dir

	return nil
}

func (w *world) seedForeignSchema(ctx context.Context) error {
	if err := w.prepare(); err != nil {
		return err
	}

	db, err := sqlite.Open(ctx, sqlite.Config{Path: w.dbPath})
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}

	defer func() { _ = db.Close() }()

	if _, execErr := db.ExecContext(ctx,
		`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)`); execErr != nil {
		return fmt.Errorf("foreign table: %w", execErr)
	}

	return nil
}

func (w *world) seedUnsupportedSchema(ctx context.Context, version int) error {
	if err := w.prepare(); err != nil {
		return err
	}

	db, err := sqlite.Open(ctx, sqlite.Config{Path: w.dbPath})
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}

	defer func() { _ = db.Close() }()

	createTable := `CREATE TABLE schema_migrations (` +
		`version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`
	if _, err := db.ExecContext(ctx, createTable); err != nil {
		return fmt.Errorf("foreign table: %w", err)
	}

	if _, err := db.ExecContext(ctx,
		`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
		version, "2026-01-01T00:00:00Z"); err != nil {
		return fmt.Errorf("foreign version: %w", err)
	}

	return nil
}

func (w *world) clearDatabase(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	clearOrder := []string{
		"export_events",
		"exports",
		"import_events",
		"import_upload_chunks",
		"import_uploads",
		"import_rows",
		"import_batches",
		"artifacts",
		"mail_messages",
		"entry_balances",
		"postings",
		"balance_state",
		"capture_payloads",
		"captures",
		"entries",
		"audit_log",
		"recurring_rules",
		"custom_queries",
		"payees",
		"fx_rates",
		"accounts",
		"categorization_rules",
		"settings",
		"api_tokens",
		"connections",
	}

	for _, table := range clearOrder {
		if _, err := w.store.DB().ExecContext(ctx, `DELETE FROM `+table); err != nil {
			return fmt.Errorf("clear %s: %w", table, err)
		}
	}

	if w.settings != nil {
		w.settings.InvalidateCache()
	}

	return nil
}

func (w *world) countTable(ctx context.Context, table string) (int, error) {
	if w.store == nil {
		return 0, errors.New(`no running API: add the step "a running API" first`)
	}

	if !slices.Contains(allowedTables, table) {
		return 0, fmt.Errorf("counting %q is not allowed", table)
	}

	var count int

	//nolint:gosec // G201: the table name is allow-listed immediately above
	query := "SELECT COUNT(*) FROM " + table

	err := w.store.DB().QueryRowContext(ctx, query).Scan(&count)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("count %s: %w", table, err)
	}

	return count, nil
}

func (w *world) openFiles() error {
	artifacts, err := filestore.New(
		filepath.Join(w.dir, config.DefaultArtifactDirName), []byte(appSecret),
	)
	if err != nil {
		return fmt.Errorf("filestore: %w", err)
	}

	exportFiles, err := filestore.New(
		filepath.Join(w.dir, config.DefaultExportDirName), []byte(appSecret),
	)
	if err != nil {
		return fmt.Errorf("export filestore: %w", err)
	}

	parts, err := filestore.NewParts(filepath.Join(w.dir, config.DefaultImportDirName))
	if err != nil {
		return fmt.Errorf("import parts: %w", err)
	}

	w.artifacts = artifacts
	w.exportFiles = exportFiles
	w.parts = parts

	return nil
}

func (w *world) seedSettings(ctx context.Context, service *settings.Service) error {
	if _, _, err := service.EnsureInitial(ctx, w.password, ""); err != nil {
		return fmt.Errorf("settings: %w", err)
	}

	if w.password != "" && !w.passwordMustChange {
		if _, err := service.ChangePassword(ctx, w.password, w.password); err != nil {
			return fmt.Errorf("password: %w", err)
		}
	}

	if _, err := service.EnsureTimezone(ctx, ""); err != nil {
		return fmt.Errorf("timezone: %w", err)
	}

	return nil
}
