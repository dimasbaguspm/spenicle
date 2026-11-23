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

	"github.com/dimasbaguspm/spenicle/internal/app"
	"github.com/dimasbaguspm/spenicle/internal/config"
	"github.com/dimasbaguspm/spenicle/internal/platform/otelx"
	"github.com/dimasbaguspm/spenicle/internal/platform/seal"
	"github.com/dimasbaguspm/spenicle/internal/port"
)

const (
	serviceName = "spenicle"

	telemetryShutdownTimeout = 5 * time.Second
	httpShutdownTimeout      = 10 * time.Second

	readHeaderTimeout = 5 * time.Second
	readTimeout       = 15 * time.Second
	writeTimeout      = 30 * time.Second
	idleTimeout       = 60 * time.Second
)

// version is stamped at build time.
var version = "dev"

func main() {
	if err := run(); err != nil {
		// No logger yet: this is the last line before the process dies.
		fmt.Fprintf(os.Stderr, "spenicle: %v\n", err)
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
		ServiceName: serviceName,
		Version:     version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}
	defer flushTelemetry(ctx, logger, shutdownTelemetry)

	sealer, err := newSealer(ctx, cfg, logger)
	if err != nil {
		return err
	}

	application, err := app.New(ctx, app.Config{
		DBPath:       filepath.Join(cfg.DataDir, "spenicle.db"),
		BaseCurrency: cfg.BaseCurrency,
		Sealer:       sealer,
		Logger:       logger,
	})
	if err != nil {
		return err
	}

	defer func() {
		if closeErr := application.Close(); closeErr != nil {
			logger.ErrorContext(ctx, "close application", slog.Any("error", closeErr))
		}
	}()

	return serve(ctx, cfg, application, logger)
}

// serve blocks until the context is cancelled or the listener fails.
func serve(
	ctx context.Context,
	cfg config.Config,
	application *app.App,
	logger *slog.Logger,
) error {
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           application.Handler,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	errCh := make(chan error, 1)

	go func() {
		logger.InfoContext(ctx, "listening",
			slog.String("addr", cfg.Addr),
			slog.String("base_currency", application.BaseCurrency),
			slog.Bool("sealed", cfg.Sealed()),
			slog.String("version", version))

		if listenErr := srv.ListenAndServe(); listenErr != nil &&
			!errors.Is(listenErr, http.ErrServerClosed) {
			errCh <- listenErr
		}
	}()

	select {
	case listenErr := <-errCh:
		return fmt.Errorf("serve: %w", listenErr)
	case <-ctx.Done():
		logger.InfoContext(ctx, "shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), httpShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}

func flushTelemetry(ctx context.Context, logger *slog.Logger, shutdown func(context.Context) error) {
	shutdownCtx, cancel := context.WithTimeout(ctx, telemetryShutdownTimeout)
	defer cancel()

	if err := shutdown(shutdownCtx); err != nil {
		logger.ErrorContext(shutdownCtx, "telemetry shutdown", slog.Any("error", err))
	}
}

func newSealer(ctx context.Context, cfg config.Config, logger *slog.Logger) (port.Sealer, error) {
	if !cfg.Sealed() {
		logger.WarnContext(ctx, "APP_SECRET is unset: capture payloads and artifacts stay plaintext")

		return seal.Passthrough{}, nil
	}

	sealer, err := seal.New(cfg.AppSecret)
	if err != nil {
		return nil, fmt.Errorf("sealer: %w", err)
	}

	return sealer, nil
}
