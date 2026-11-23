// Package app is the composition root: it reads the environment, wires the
// adapters and decides which long-running loops this process serves.
//
// One image, three calls: "http" serves the API, "worker" only posts the due
// recurring rules, and "all" (the default) does both in this one process.
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	ModeHTTP   = "http"
	ModeWorker = "worker"
	ModeAll    = "all"
)

var Version = "dev" //nolint:gochecknoglobals // the build stamp, set once with -ldflags -X

func Run(ctx context.Context, mode string) error {
	cfg, err := config.Load(ctx)
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	shutdownTelemetry, err := telemetry.Setup(ctx, telemetry.Config{
		ServiceName: cfg.ServiceName,
		Version:     Version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return fmt.Errorf("telemetry: %w", err)
	}

	defer flushTelemetry(ctx, logger, cfg.TelemetryShutdownTimeout, shutdownTelemetry)

	application, err := newApp(ctx, cfg, Version, logger)
	if err != nil {
		return err
	}

	defer func() {
		if closeErr := application.Close(ctx); closeErr != nil {
			logger.ErrorContext(ctx, "close application", slog.Any("error", closeErr))
		}
	}()

	return application.serve(ctx, mode, cfg, logger)
}

func (a *app) serve(
	ctx context.Context,
	mode string,
	cfg entity.AppConfig,
	logger *slog.Logger,
) error {
	switch mode {
	case ModeHTTP:
		return a.listen(ctx, cfg, logger)
	case ModeWorker:
		a.runWorker(ctx, cfg, logger)

		return nil
	case ModeAll:
		var running sync.WaitGroup

		running.Add(1)

		go func() {
			defer running.Done()

			a.runWorker(ctx, cfg, logger)
		}()

		listenErr := a.listen(ctx, cfg, logger)

		running.Wait()

		return listenErr
	default:
		return fmt.Errorf("unknown mode %q: want %q, %q or %q", mode, ModeHTTP, ModeWorker, ModeAll)
	}
}

func (a *app) runWorker(ctx context.Context, cfg entity.AppConfig, logger *slog.Logger) {
	logger.InfoContext(ctx, "recurring worker started",
		slog.Duration("every", cfg.WorkerInterval))

	a.Worker.Serve(ctx, cfg.WorkerInterval)
}

func (a *app) listen(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *slog.Logger,
) error {
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           a.Handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)

	go func() {
		logger.InfoContext(ctx, "listening",
			slog.String("addr", cfg.Addr),
			slog.String("base_currency", a.BaseCurrency),
			slog.Bool("sealed", cfg.Sealed()),
			slog.String("version", Version))

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
