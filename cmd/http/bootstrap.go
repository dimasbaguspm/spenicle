package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

// app is the assembled graph. Nothing reaches for a global.
type app struct {
	DB           *sql.DB
	Store        *sqlite.Store
	Handler      http.Handler
	BaseCurrency string
}

// newApp opens, migrates, seeds and wires the process. Every knob arrives in cfg;
// the only thing this function adds is a version string stamped at build time.
//
// uat assembles the same graph by hand because this file is package main and
// therefore not importable; keep the two in step when a dependency is added.
func newApp(
	ctx context.Context,
	cfg entity.AppConfig,
	version string,
	logger *slog.Logger,
) (*app, error) {
	sealer, err := resolveSealer(ctx, logger, cfg.AppSecret)
	if err != nil {
		return nil, err
	}

	store, err := sqlite.New(ctx, sqlite.Config{
		Path:         cfg.DBPath,
		MaxOpenConns: cfg.DBMaxOpenConns,
		MaxIdleConns: cfg.DBMaxIdleConns,
	})
	if err != nil {
		return nil, err
	}

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		_ = store.Close(ctx)

		return nil, fmt.Errorf("migrate: %w", migrateErr)
	}

	baseCurrency, err := store.EnsureBaseline(ctx, cfg.BaseCurrency, sealer.Fingerprint())
	if err != nil {
		_ = store.Close(ctx)

		return nil, fmt.Errorf("baseline: %w", err)
	}

	// clock.System satisfies both the time and the id contract.
	clockSystem := clock.System{}

	return &app{
		DB:           store.DB(),
		Store:        store,
		BaseCurrency: baseCurrency,
		Handler: handlers.New(handlers.Deps{
			Ledger:        ledger.New(store, store, clockSystem, clockSystem),
			Health:        store,
			Sealer:        sealer,
			BaseCurrency:  baseCurrency,
			Version:       version,
			HealthTimeout: cfg.HealthTimeout,
			MaxBodyBytes:  cfg.MaxBodyBytes,
			Logger:        logger,
		}),
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
