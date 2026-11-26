package uat

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/cucumber/godog"

	workerhandlers "github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func aFreshWorld(options Options) func(context.Context, *godog.Scenario) (context.Context, error) {
	return func(ctx context.Context, scenario *godog.Scenario) (context.Context, error) {
		if options.RatesEndpoint == "" && strings.Contains(scenario.Uri, "rates") {
			return ctx, godog.ErrSkip
		}

		if tagged(scenario, "vendors") && !options.vendorsReady() {
			return ctx, godog.ErrSkip
		}

		return context.WithValue(ctx, worldKey{}, newWorld(options)), nil
	}
}

func tagged(scenario *godog.Scenario, name string) bool {
	for _, tag := range scenario.Tags {
		if strings.TrimPrefix(tag.Name, "@") == name {
			return true
		}
	}

	return false
}

func tearDownWorld(ctx context.Context, _ *godog.Scenario, _ error) (context.Context, error) {
	if w, ok := ctx.Value(worldKey{}).(*world); ok {
		w.shutdown(ctx)
	}

	return ctx, nil
}

const (
	maxPreview = 120

	appSecret = "uat-secret-0123456789"

	stubKey       = "project-key"
	stubModel     = "gpt-4o-mini"
	vendorTimeout = 10 * time.Second

	worldListLimit = 200
	shaHexLen      = 64
)

type worldKey struct{}

type world struct {
	baseCurrency string
	dir          string
	dbPath       string
	store        *sqlite.Store
	server       *httptest.Server
	accounts     map[string]string
	options      Options
	logs         *logSink

	rail            string
	extractionFault faultType
	ratesFault      faultType
	bootErr         error

	status int
	body   []byte
	header http.Header

	pendingBody []byte
	rates       *rates.Service
	dbBroken    bool
	lastRef     string
	refs        map[string]string

	ledger             ledger.Contract
	settings           *settings.Service
	artifacts          *filestore.Store
	exportFiles        *filestore.Store
	parts              *filestore.Parts
	location           *time.Location
	sealer             seal.Sealer
	commitChunk        int
	exports            exports.Contract
	exportDeps         export.Deps
	limits             entity.AppConfig
	apiAsOf            time.Time
	asOf               time.Time
	workerSummary      workerhandlers.Summary
	password           string
	passwordMustChange bool
	rootCredential     string
	credential         string
	issued             string
	issuedRef          string
}

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

type logSink struct {
	mu      sync.Mutex
	records []slog.Record
}

func (l *logSink) Enabled(context.Context, slog.Level) bool { return true }

func (l *logSink) Handle(_ context.Context, record slog.Record) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.records = append(l.records, record.Clone())

	return nil
}

func (l *logSink) WithAttrs([]slog.Attr) slog.Handler { return l }

func (l *logSink) WithGroup(string) slog.Handler { return l }

func (l *logSink) failure() string {
	l.mu.Lock()
	defer l.mu.Unlock()

	for _, record := range l.records {
		if record.Level >= slog.LevelError {
			return record.Level.String() + " " + record.Message
		}
	}

	return ""
}

func newWorld(options Options) *world {
	return &world{
		baseCurrency: "IDR",
		accounts:     map[string]string{},
		refs:         map[string]string{},
		options:      options,
		logs:         &logSink{},
	}
}

func worldFrom(ctx context.Context) (*world, error) {
	world, ok := ctx.Value(worldKey{}).(*world)
	if !ok {
		return nil, errors.New("scenario world is missing: run through godog")
	}

	return world, nil
}

func (w *world) prepare() error {
	if w.dir != "" {
		return nil
	}

	dir, err := os.MkdirTemp("", "spenicle-uat-")
	if err != nil {
		return fmt.Errorf("temp dir: %w", err)
	}

	w.dir = dir
	w.dbPath = filepath.Join(dir, "spenicle.db")

	return nil
}

func (w *world) shutdown(ctx context.Context) {
	if w.server != nil {
		w.server.Close()
	}

	if w.store != nil && !w.dbBroken {
		_ = w.store.Close(ctx)
	}

	if w.dir != "" {
		_ = os.RemoveAll(w.dir)
	}
}
