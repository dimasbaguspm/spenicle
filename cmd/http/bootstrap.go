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
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
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

	// clock.System satisfies both the time and the id contract.
	clockSystem := clock.System{}
	ledgerService := ledger.New(store, settingsService, clockSystem, clockSystem)

	return &app{
		DB:           store.DB(),
		Store:        store,
		BaseCurrency: baseCurrency,
		Handler: handlers.New(handlers.Deps{
			Ledger: ledgerService,
			Captures: captures.New(
				store, ledgerService, sealer, extractor, clockSystem, clockSystem,
			),
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

// Close releases the database handle.
func (a *app) Close(ctx context.Context) error {
	if err := a.Store.Close(ctx); err != nil {
		return fmt.Errorf("close database: %w", err)
	}

	return nil
}

// prepare seeds settings, prints the first password once and applies the baseline.
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

// buildExtractor returns nil when SNAPTOJSON_API_KEY is unset: no key, no vendor,
// captures stay raw. A key means one client for the process.
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

// selectRail is the whole rail policy in one place: SnapToJSON wins when its key is
// set, OpenAI is the fallback, and no key means extraction is off. The module never
// learns which one it got.
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

// passwordBytes is long enough to survive being written on paper.
const passwordBytes = 18

// generatePassword is what a fresh boot prints once: 18 random bytes, url-safe.
func generatePassword() (string, error) {
	raw := make([]byte, passwordBytes)

	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("entropy: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(raw), nil
}
