package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type app struct {
	DB           *sql.DB
	Store        *sqlite.Store
	Handler      http.Handler
	BaseCurrency string
}

func newApp(
	ctx context.Context,
	cfg entity.AppConfig,
	version string,
	logger *slog.Logger,
) (*app, error) {
	sealer, err := seal.New(cfg.AppSecret)
	if err != nil {
		return nil, fmt.Errorf("sealer: %w", err)
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

	extractor, err := buildExtractor(ctx, cfg, logger)
	if err != nil {
		_ = store.Close(ctx)

		return nil, err
	}

	settingsService, baseCurrency, err := prepare(ctx, store, sealer, logger)
	if err != nil {
		_ = store.Close(ctx)

		return nil, err
	}

	clockSystem := clock.System{}
	ledgerService := ledger.New(store, settingsService, clockSystem, clockSystem)

	ratesService, err := ratesFor(ctx, cfg, store, clockSystem)
	if err != nil {
		return nil, err
	}

	return &app{
		DB:           store.DB(),
		Store:        store,
		BaseCurrency: baseCurrency,
		Handler: handlers.New(handlers.Deps{
			Ledger: ledgerService,
			Captures: captures.New(
				store, ledgerService, sealer, extractor, clockSystem, clockSystem,
			),
			Rates:             ratesService,
			Accounts:          store,
			Settings:          settingsService,
			Health:            store,
			Sealer:            sealer,
			BaseCurrency:      baseCurrency,
			Version:           version,
			HealthTimeout:     cfg.HealthTimeout,
			MaxBodyBytes:      cfg.MaxBodyBytes,
			ExtractionEnabled: cfg.SnapToJSONAPIKey != "",
			Logger:            logger,
		}),
	}, nil
}

func ratesFor(
	ctx context.Context,
	cfg entity.AppConfig,
	store *sqlite.Store,
	clockSystem clock.System,
) (*rates.Service, error) {
	source, err := ecb.New(cfg.ECBEndpoint, cfg.ECBTimeout, clockSystem)
	if err != nil {
		_ = store.Close(ctx)

		return nil, fmt.Errorf("ecb rates: %w", err)
	}

	return rates.New(source, store, clockSystem), nil
}

func (a *app) Close(ctx context.Context) error {
	if err := a.Store.Close(ctx); err != nil {
		return fmt.Errorf("close database: %w", err)
	}

	return nil
}

func prepare(
	ctx context.Context,
	store *sqlite.Store,
	sealer seal.Sealer,
	logger *slog.Logger,
) (*settings.Service, string, error) {
	service := settings.New(store, sealer, clock.System{})

	freshPassword, err := generatePassword()
	if err != nil {
		return nil, "", err
	}

	appSettings, err := service.EnsureInitial(ctx, freshPassword)
	if err != nil {
		return nil, "", fmt.Errorf("settings: %w", err)
	}

	if appSettings.PasswordMustChange {
		logger.WarnContext(ctx, "generated the initial password; change it after the first sign-in",
			slog.String("password", appSettings.Password))
	}

	baseCurrency, err := store.EnsureBaseline(ctx, appSettings.BaseCurrency, sealer.Fingerprint())
	if err != nil {
		return nil, "", fmt.Errorf("baseline: %w", err)
	}

	return service, baseCurrency, nil
}

func buildExtractor(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *slog.Logger,
) (extraction.Extractor, error) {
	rail, err := selectRail(ctx, cfg, logger)
	if err != nil {
		return nil, err
	}

	return rail, nil
}

func selectRail(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *slog.Logger,
) (extraction.Extractor, error) {
	if cfg.SnapToJSONAPIKey != "" {
		rail, err := snaptojson.New(cfg.SnapToJSONEndpoint, cfg.SnapToJSONAPIKey, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("snaptojson rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	if cfg.OpenAIAPIKey != "" {
		rail, err := openai.New(cfg.OpenAIAPIKey, cfg.OpenAIModel, "", cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("openai rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	logger.InfoContext(ctx, "no extraction rail configured: captures stay manual")

	return nil, nil //nolint:nilnil // nil extractor is the documented "disabled" mode
}

const passwordBytes = 18

func generatePassword() (string, error) {
	raw := make([]byte, passwordBytes)

	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("entropy: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(raw), nil
}
