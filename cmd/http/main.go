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

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
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

	shutdownTelemetry, err := telemetry.Setup(ctx, telemetry.Config{
		ServiceName: serviceName,
		Version:     version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}
	defer flushTelemetry(ctx, logger, shutdownTelemetry)

	application, err := newApp(ctx, appConfig{
		DBPath:       filepath.Join(cfg.DataDir, "spenicle.db"),
		BaseCurrency: cfg.BaseCurrency,
		AppSecret:    cfg.AppSecret,
		Version:      version,
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
	application *app,
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
