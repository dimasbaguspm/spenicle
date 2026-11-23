package config

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type Process struct {
	Cfg          entity.AppConfig
	Logger       *logging.Logger
	Store        *sqlite.Store
	Sealer       seal.Sealer
	Artifacts    *filestore.Store
	Exports      *filestore.Store
	Settings     *settings.Service
	Ledger       *ledger.Service
	Rates        *rates.Service
	BaseCurrency string
	Location     *time.Location

	stopTelemetry func(context.Context) error
}

func Start(ctx context.Context, serviceName string) (*Process, error) {
	if strings.TrimSpace(serviceName) == "" {
		return nil, errors.New("service name is required")
	}

	cfg, err := Load(ctx)
	if err != nil {
		return nil, err
	}

	cfg.ServiceName = serviceName

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))
	logger := logging.New(telemetry.CurrentComponent())

	stopTelemetry, err := telemetry.Setup(ctx, telemetry.Config{
		ServiceName: cfg.ServiceName,
		Version:     Version,
		Endpoint:    cfg.OTLPEndpoint,
	})
	if err != nil {
		return nil, fmt.Errorf("telemetry: %w", err)
	}

	process, err := boot(ctx, cfg, logger)
	if err != nil {
		flushTelemetry(ctx, logger, cfg.TelemetryShutdownTimeout, stopTelemetry)
		return nil, err
	}

	process.stopTelemetry = stopTelemetry

	return process, nil
}

func (p *Process) Close(ctx context.Context) {
	if err := p.Store.Close(ctx); err != nil {
		p.Logger.Error(ctx, "close database", slog.Any("error", err))
	}

	flushTelemetry(ctx, p.Logger, p.Cfg.TelemetryShutdownTimeout, p.stopTelemetry)
}

func boot(ctx context.Context, cfg entity.AppConfig, logger *logging.Logger) (*Process, error) {
	store, err := openStore(ctx, cfg)
	if err != nil {
		return nil, err
	}

	sealer, err := seal.New(cfg.AppSecret)
	if err != nil {
		_ = store.Close(ctx)
		return nil, fmt.Errorf("sealer: %w", err)
	}

	settingsService, appSettings, baseCurrency, err := prepare(ctx, cfg, store, sealer, logger)
	if err != nil {
		_ = store.Close(ctx)
		return nil, err
	}

	location, err := time.LoadLocation(appSettings.Timezone)
	if err != nil {
		_ = store.Close(ctx)
		return nil, fmt.Errorf("timezone %q: %w", appSettings.Timezone, err)
	}

	cfg.Timezone = appSettings.Timezone

	artifacts, err := filestore.New(cfg.ArtifactDir, []byte(cfg.AppSecret))
	if err != nil {
		_ = store.Close(ctx)
		return nil, fmt.Errorf("filestore: %w", err)
	}

	exportFiles, err := filestore.New(cfg.ExportDir, []byte(cfg.AppSecret))
	if err != nil {
		_ = store.Close(ctx)
		return nil, fmt.Errorf("export filestore: %w", err)
	}

	ledgerService := ledger.New(store, store, store, settingsService, clock.System{}, clock.System{})

	ratesService, err := ratesFor(ctx, cfg, store, logger)
	if err != nil {
		_ = store.Close(ctx)
		return nil, err
	}

	return &Process{
		Cfg:          cfg,
		Logger:       logger,
		Store:        store,
		Sealer:       sealer,
		Artifacts:    artifacts,
		Exports:      exportFiles,
		Settings:     settingsService,
		Ledger:       ledgerService,
		Rates:        ratesService,
		BaseCurrency: baseCurrency,
		Location:     location,
	}, nil
}

func openStore(ctx context.Context, cfg entity.AppConfig) (*sqlite.Store, error) {
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

	return store, nil
}

func prepare(
	ctx context.Context,
	cfg entity.AppConfig,
	store *sqlite.Store,
	sealer seal.Sealer,
	logger *logging.Logger,
) (*settings.Service, entity.Settings, string, error) {
	service := settings.New(store, sealer, clock.System{})

	freshPassword, err := generatePassword()
	if err != nil {
		return nil, entity.Settings{}, "", err
	}

	_, created, err := service.EnsureInitial(ctx, freshPassword, cfg.Timezone)
	if err != nil {
		return nil, entity.Settings{}, "", fmt.Errorf("settings: %w", err)
	}

	if created && freshPassword != "" {
		logger.Warn(ctx, "generated the initial password; change it after the first sign-in",
			slog.String("password", freshPassword))
	}

	appSettings, err := service.EnsureTimezone(ctx, cfg.Timezone)
	if err != nil {
		return nil, entity.Settings{}, "", fmt.Errorf("config: %w", err)
	}

	baseCurrency, err := store.EnsureBaseline(ctx, appSettings.BaseCurrency, sealer.Fingerprint())
	if err != nil {
		return nil, entity.Settings{}, "", fmt.Errorf("baseline: %w", err)
	}

	return service, appSettings, baseCurrency, nil
}

func ratesFor(
	ctx context.Context,
	cfg entity.AppConfig,
	store *sqlite.Store,
	logger *logging.Logger,
) (*rates.Service, error) {
	source, err := ecb.New(cfg.ECBEndpoint, cfg.ECBTimeout, clock.System{})
	if err != nil {
		return nil, fmt.Errorf("ecb rates: %w", err)
	}

	service := rates.New(source, store, clock.System{})
	warmRates(ctx, service, logger)

	return service, nil
}

func warmRates(ctx context.Context, service *rates.Service, logger *logging.Logger) {
	report, err := service.Refresh(ctx)
	if err != nil {
		logger.Warn(ctx, "reference rates refresh failed; serving stored rates",
			slog.Any("error", err))

		return
	}

	logger.Info(ctx, "reference rates cached", slog.Int("stored", report.Stored))
}

func flushTelemetry(
	ctx context.Context,
	logger *logging.Logger,
	timeout time.Duration,
	shutdown func(context.Context) error,
) {
	if shutdown == nil {
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), timeout)
	defer cancel()

	if err := shutdown(shutdownCtx); err != nil {
		logger.Error(shutdownCtx, "telemetry shutdown", slog.Any("error", err))
	}
}

const passwordBytes = 18

func generatePassword() (string, error) {
	raw := make([]byte, passwordBytes)

	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("entropy: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(raw), nil
}
