package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/bootstrap"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

// appConfig is what the composition root is allowed to read from the
// environment. Everything below this line is wired, not configured.
type appConfig struct {
	DBPath       string
	BaseCurrency string
	AppSecret    string
	Version      string
	Logger       *slog.Logger
}

// app is the assembled graph. Nothing reaches for a global.
type app struct {
	DB           *sql.DB
	Store        *sqlite.Store
	Handler      http.Handler
	BaseCurrency string
}

// newApp opens, migrates, seeds and wires the process. The caller owns Close.
//
// uat assembles the same graph by hand because this file is package main and
// therefore not importable; keep the two in step when a dependency is added.
func newApp(ctx context.Context, cfg appConfig) (*app, error) {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}

	sealer, err := resolveSealer(ctx, logger, cfg.AppSecret)
	if err != nil {
		return nil, err
	}

	store, err := sqlite.New(ctx, sqlite.Config{Path: cfg.DBPath})
	if err != nil {
		return nil, err
	}

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		_ = store.Close(ctx)

		return nil, fmt.Errorf("migrate: %w", migrateErr)
	}

	baseCurrency, err := bootstrap.New(store, store).
		EnsureBaseline(ctx, cfg.BaseCurrency, sealer.Fingerprint())
	if err != nil {
		_ = store.Close(ctx)

		return nil, fmt.Errorf("bootstrap: %w", err)
	}

	return &app{
		DB:           store.DB(),
		Store:        store,
		Handler:      newRouter(store, sealer, baseCurrency, cfg.Version, logger),
		BaseCurrency: baseCurrency,
	}, nil
}

// Close releases the database handle.
func (a *app) Close(ctx context.Context) error {
	if err := a.Store.Close(ctx); err != nil {
		return fmt.Errorf("close database: %w", err)
	}

	return nil
}

// resolveSealer returns the AES sealer when APP_SECRET is set and the honest
// passthrough when it is not.
func resolveSealer(ctx context.Context, logger *slog.Logger, secret string) (seal.Sealer, error) {
	if secret == "" {
		logger.WarnContext(ctx, "APP_SECRET is unset: capture payloads and artifacts stay plaintext")

		return seal.Passthrough{}, nil
	}

	sealer, err := seal.New(secret)
	if err != nil {
		return nil, fmt.Errorf("sealer: %w", err)
	}

	return sealer, nil
}
