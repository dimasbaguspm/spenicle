package uat

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http/httptest"
	"time"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
	"github.com/dimasbaguspm/spenicle/internal/repository/oauth/google"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type faultType string

type bootFoundation struct {
	store        *sqlite.Store
	sealer       *seal.AES
	baseCurrency string
}

const (
	faultNone   faultType = ""
	faultDown   faultType = "down"
	faultBroken faultType = "broken"
)

func (w *world) boot(ctx context.Context) error {
	if w.server != nil {
		return nil
	}

	startedAt := time.Now().UTC()

	if err := w.prepare(); err != nil {
		return err
	}

	foundation, err := w.foundation(ctx)
	if err != nil {
		return err
	}

	store := foundation.store
	sealer := foundation.sealer
	baseCurrency := foundation.baseCurrency

	clockSystem := clock.System{}
	limits := config.Defaults()

	if storeErr := w.openFiles(); storeErr != nil {
		_ = store.Close(ctx)

		return storeErr
	}

	artifacts := w.artifacts

	w.location = time.UTC
	w.limits = limits

	settingsService := settings.New(store, sealer, settingsClock{at: w.apiAsOf})

	if settingsErr := w.seedSettings(ctx, settingsService); settingsErr != nil {
		_ = store.Close(ctx)

		return settingsErr
	}

	built, buildErr := w.dependencies(ctx, store, limits, clockSystem)
	if buildErr != nil {
		_ = store.Close(ctx)

		return buildErr
	}

	w.rates = built.cache

	ledgerService := ledger.New(store, store, store, settingsService, built.rates,
		clockSystem, clockSystem)

	accounts, err := store.ListAccounts(ctx, entity.AccountFilter{Limit: worldListLimit})
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("accounts: %w", err)
	}

	w.store = store
	w.ledger = ledgerService
	w.sealer = sealer

	for _, account := range accounts {
		w.accounts[account.Name] = account.Ref
	}

	queue := captures.New(
		store, ledgerService, sealer, artifacts, store, built.extractor, store,
		clockSystem, clockSystem,
	)

	w.exportDeps = export.Deps{
		Ledger:        store,
		Exporter:      store,
		CustomQueries: store,
		Rates:         store,
		System:        store,
		Clock:         clockSystem,
		BaseCurrency:  baseCurrency,
	}

	w.exports = exports.New(
		store, store, store, w.exportFiles, limits.ExportRetention, clockSystem,
	)

	schemaVersion, err := store.SchemaVersion(ctx)
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("schema version: %w", err)
	}

	event := entity.SystemStarted{
		Service:       "spenicle-http",
		Version:       "uat",
		SchemaVersion: schemaVersion,
		StartedAt:     startedAt.Format(constant.TimestampLayout),
	}

	if err := store.RecordSystemStart(ctx, event); err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("record system start: %w", err)
	}

	w.server = httptest.NewServer(httpcmd.New(handlers.Deps{
		Ledger:   ledgerService,
		Captures: queue,
		Intake:   intake.New(store, queue, store, sealer, fakeMailbox{}),
		Imports: imports.New(
			store, store, store, store, ledgerService, artifacts, w.parts, settingsService,
			clockSystem,
			imports.Options{MaxRows: limits.ImportMaxRows, CommitChunk: w.chunk()},
		),
		Accounts:       store,
		Payees:         store,
		Recurring:      store,
		Rules:          store,
		Categorization: categorization.New(store),
		Analytics:      store,
		CustomQueries:  store,
		Exports:        w.exports,
		Artifacts:      store,
		ArtifactFiles:  artifacts,
		ExportFiles:    w.exportFiles,
		Health:         store,
		Audit:          store,
		Tokens:         tokens.New(store, sealer, settingsClock{at: w.apiAsOf}),
		Connections: connections.New(store, store, sealer,
			google.New(nil, "", w.options.GoogleTokenEndpoint,
				w.options.GoogleRevokeEndpoint), clockSystem),
		Settings:          settingsService,
		Rates:             built.rates,
		Sealer:            sealer,
		BaseCurrency:      baseCurrency,
		Timezone:          w.zone().String(),
		Version:           "uat",
		StartedAt:         startedAt,
		HealthTimeout:     limits.HealthTimeout,
		MaxBodyBytes:      limits.MaxBodyBytes,
		MaxArtifactBytes:  limits.ArtifactMaxBytes,
		ImportMaxBytes:    limits.ImportMaxBytes,
		ExtractionEnabled: w.rail != "",
		AIAssistance:      false,
		Logger:            logging.From(slog.New(w.logs), telemetry.ComponentHTTP),
	}))

	return nil
}

func (w *world) foundation(ctx context.Context) (bootFoundation, error) {
	store, err := sqlite.New(ctx, sqlite.Config{Path: w.dbPath})
	if err != nil {
		return bootFoundation{}, fmt.Errorf("open: %w", err)
	}

	err = sqlite.Migrate(ctx, store.DB())
	if err != nil {
		_ = store.Close(ctx)

		return bootFoundation{}, fmt.Errorf("migrate: %w", err)
	}

	sealer, err := seal.New(appSecret)
	if err != nil {
		_ = store.Close(ctx)

		return bootFoundation{}, fmt.Errorf("sealer: %w", err)
	}

	baseCurrency, err := store.EnsureBaseline(ctx, w.baseCurrency, sealer.Fingerprint())
	if err != nil {
		_ = store.Close(ctx)

		return bootFoundation{}, fmt.Errorf("bootstrap: %w", err)
	}

	return bootFoundation{store: store, sealer: sealer, baseCurrency: baseCurrency}, nil
}

type settingsClock struct{ at time.Time }

func (c settingsClock) Now() time.Time {
	if c.at.IsZero() {
		return time.Now().UTC()
	}

	return c.at
}

func (w *world) restart(ctx context.Context) error {
	if w.server == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	w.server.Close()
	w.server = nil

	if w.store != nil && !w.dbBroken {
		_ = w.store.Close(ctx)
	}

	w.store = nil
	w.accounts = map[string]string{}

	return w.boot(ctx)
}
