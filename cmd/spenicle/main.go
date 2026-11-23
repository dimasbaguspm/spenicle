// Command spenicle is the whole product: one binary, one file, one port.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/adapter/httpapi"
	"github.com/dimasbaguspm/spenicle/internal/adapter/sqlite"
	"github.com/dimasbaguspm/spenicle/internal/config"
	"github.com/dimasbaguspm/spenicle/internal/platform/clockx"
	"github.com/dimasbaguspm/spenicle/internal/platform/otelx"
	"github.com/dimasbaguspm/spenicle/internal/platform/seal"
	"github.com/dimasbaguspm/spenicle/internal/port"
	"github.com/dimasbaguspm/spenicle/internal/usecase/bootstrap"
	"github.com/dimasbaguspm/spenicle/internal/usecase/ledger"
)

// version is stamped at build time.
var version = "dev"

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	shutdownTelemetry, err := otelx.Setup(ctx, otelx.Config{
		ServiceName: "spenicle",
		Version:     version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownTelemetry(shutdownCtx); err != nil {
			logger.Error("telemetry shutdown", "error", err)
		}
	}()

	sealer, err := newSealer(cfg, logger)
	if err != nil {
		return err
	}

	db, err := sqlite.Open(sqlite.Config{Path: filepath.Join(cfg.DataDir, "spenicle.db")})
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	if err := sqlite.Migrate(ctx, db); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	store := sqlite.NewStore(db)

	baseCurrency, err := bootstrap.New(store, store).EnsureBaseline(ctx, cfg.BaseCurrency, sealer.Fingerprint())
	if err != nil {
		return fmt.Errorf("bootstrap: %w", err)
	}

	ledgerService := ledger.New(store, store, clockx.Clock{}, clockx.IDs{})

	api := httpapi.New(httpapi.Deps{
		Ledger:       ledgerService,
		Health:       store,
		Sealer:       sealer,
		BaseCurrency: baseCurrency,
		Logger:       logger,
	})

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "base_currency", baseCurrency,
			"sealed", cfg.Sealed(), "version", version)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
		logger.Info("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

func newSealer(cfg config.Config, logger *slog.Logger) (port.Sealer, error) {
	if !cfg.Sealed() {
		logger.Warn("APP_SECRET is unset: capture payloads and artifacts stay plaintext")
		return seal.Passthrough{}, nil
	}
	sealer, err := seal.New(cfg.AppSecret)
	if err != nil {
		return nil, fmt.Errorf("sealer: %w", err)
	}
	return sealer, nil
}
