// Package app is the composition root. main and the BDD suite both call New,
// so the wiring exists in exactly one place.
package app

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/adapter/httpapi"
	"github.com/dimasbaguspm/spenicle/internal/adapter/sqlite"
	"github.com/dimasbaguspm/spenicle/internal/platform/clockx"
	"github.com/dimasbaguspm/spenicle/internal/port"
	"github.com/dimasbaguspm/spenicle/internal/usecase/bootstrap"
	"github.com/dimasbaguspm/spenicle/internal/usecase/ledger"
)

// Config is what the caller must decide. Paths and secrets are inputs, never
// globals.
type Config struct {
	DBPath       string
	BaseCurrency string
	Sealer       port.Sealer
	Logger       *slog.Logger
}

// App holds the assembled graph.
type App struct {
	DB           *sql.DB
	Store        *sqlite.Store
	Ledger       *ledger.Service
	Handler      http.Handler
	BaseCurrency string
}

// New opens, migrates, seeds and wires everything. The caller owns Close.
func New(ctx context.Context, cfg Config) (*App, error) {
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}

	db, err := sqlite.Open(sqlite.Config{Path: cfg.DBPath})
	if err != nil {
		return nil, err
	}

	if err := sqlite.Migrate(ctx, db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	store := sqlite.NewStore(db)

	baseCurrency, err := bootstrap.New(store, store).
		EnsureBaseline(ctx, cfg.BaseCurrency, cfg.Sealer.Fingerprint())
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("bootstrap: %w", err)
	}

	ledgerService := ledger.New(store, store, clockx.Clock{}, clockx.IDs{})

	api := httpapi.New(httpapi.Deps{
		Ledger:       ledgerService,
		Health:       store,
		Sealer:       cfg.Sealer,
		BaseCurrency: baseCurrency,
		Logger:       cfg.Logger,
	})

	return &App{
		DB:           db,
		Store:        store,
		Ledger:       ledgerService,
		Handler:      api.Handler(),
		BaseCurrency: baseCurrency,
	}, nil
}

// Close releases the database handle.
func (a *App) Close() error { return a.DB.Close() }
