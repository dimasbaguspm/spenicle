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
	"syscall"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

var version = "dev"

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "spenicle: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load(ctx)
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	shutdownTelemetry, err := telemetry.Setup(ctx, telemetry.Config{
		ServiceName: cfg.ServiceName,
		Version:     version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}
	defer flushTelemetry(ctx, logger, cfg.TelemetryShutdownTimeout, shutdownTelemetry)

	application, err := newApp(ctx, cfg, version, logger)
	if err != nil {
		return err
	}

	defer func() {
		if closeErr := application.Close(ctx); closeErr != nil {
			logger.ErrorContext(ctx, "close application", slog.Any("error", closeErr))
		}
	}()

	return serve(ctx, cfg, application, logger)
}

func serve(
	ctx context.Context,
	cfg entity.AppConfig,
	application *app,
	logger *slog.Logger,
) error {
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           application.Handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
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

	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}

func flushTelemetry(
	ctx context.Context,
	logger *slog.Logger,
	timeout time.Duration,
	shutdown func(context.Context) error,
) {
	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timeout)
	defer cancel()

	if err := shutdown(shutdownCtx); err != nil {
		logger.ErrorContext(shutdownCtx, "telemetry shutdown", slog.Any("error", err))
	}
}
