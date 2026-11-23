package uat

import (
	"archive/zip"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	workerhandlers "github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const (
	maxPreview = 120

	appSecret = "uat-secret-0123456789"

	stubKey       = "project-key"
	stubModel     = "gpt-4o-mini"
	vendorTimeout = 10 * time.Second

	worldListLimit = 200
)

type faultType string

const (
	faultNone   faultType = ""
	faultDown   faultType = "down"
	faultBroken faultType = "broken"
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

	ledger        ledger.Contract
	artifacts     *filestore.Store
	limits        entity.AppConfig
	asOf          time.Time
	workerSummary workerhandlers.Summary
}

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

func (w *world) runRecurring(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	clockSource := workerhandlers.TimeSource(fixedClock{at: w.asOf})
	if w.asOf.IsZero() {
		clockSource = clock.System{}
	}

	runner := workerhandlers.New(
		w.store, w.store, w.ledger, w.store, w.artifacts, w.limits.ArtifactRetention,
		clockSource, slog.New(w.logs),
	)

	summary, err := runner.Run(ctx)
	w.workerSummary = summary

	return err
}

func (w *world) ageArtifact(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	at := time.Now().UTC().Add(-w.limits.ArtifactRetention - time.Hour)

	if _, err := w.store.DB().ExecContext(ctx,
		`UPDATE artifacts SET created_at = ?`, at.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("age artifact: %w", err)
	}

	return nil
}

func (w *world) artifactIsGone(ctx context.Context) error {
	if w.store == nil || w.artifacts == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	var sha string

	err := w.store.DB().QueryRowContext(ctx,
		`SELECT sha256 FROM artifacts ORDER BY id DESC LIMIT 1`).Scan(&sha)
	if err != nil {
		return fmt.Errorf("read artifact sha: %w", err)
	}

	body, openErr := w.artifacts.Open(ctx, sha)
	if openErr == nil {
		_ = body.Close()

		return fmt.Errorf("artifact %s is still on disk", sha)
	}

	if !errors.Is(openErr, filestore.ErrNotFound) {
		return fmt.Errorf("open artifact %s: %w", sha, openErr)
	}

	return nil
}

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

// Options is what the harness injects: a healthy endpoint per vendor plus the two ways a
// vendor can fail — down (503) and contract broken (a body that does not parse).
type Options struct {
	RatesEndpoint        string
	RatesDownEndpoint    string
	RatesBrokenEndpoint  string
	SnapEndpoint         string
	SnapDownEndpoint     string
	SnapBrokenEndpoint   string
	OpenAIEndpoint       string
	OpenAIDownEndpoint   string
	OpenAIBrokenEndpoint string
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

func (o Options) vendorsReady() bool {
	return o.RatesEndpoint != "" && o.SnapEndpoint != "" && o.OpenAIEndpoint != ""
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

func (w *world) useDirectoryAsDatabase() error {
	if err := w.prepare(); err != nil {
		return err
	}

	w.dbPath = w.dir

	return nil
}

func (w *world) seedForeignSchema(ctx context.Context) error {
	if err := w.prepare(); err != nil {
		return err
	}

	db, err := sqlite.Open(ctx, sqlite.Config{Path: w.dbPath})
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}

	defer func() { _ = db.Close() }()

	if _, execErr := db.ExecContext(ctx,
		`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)`); execErr != nil {
		return fmt.Errorf("foreign table: %w", execErr)
	}

	return nil
}

func (w *world) boot(ctx context.Context) error {
	if w.server != nil {
		return nil
	}

	if err := w.prepare(); err != nil {
		return err
	}

	store, err := sqlite.New(ctx, sqlite.Config{Path: w.dbPath})
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("migrate: %w", migrateErr)
	}

	sealer, err := seal.New(appSecret)
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("sealer: %w", err)
	}

	baseCurrency, err := store.EnsureBaseline(ctx, w.baseCurrency, sealer.Fingerprint())
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("bootstrap: %w", err)
	}

	clockSystem := clock.System{}
	limits := config.Defaults()

	artifacts, err := filestore.New(filepath.Join(w.dir, config.DefaultArtifactDirName), []byte(appSecret))
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("filestore: %w", err)
	}

	w.artifacts = artifacts
	w.limits = limits

	settingsService := settings.New(store, sealer, clockSystem)
	if _, _, settingsErr := settingsService.EnsureInitial(ctx, ""); settingsErr != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("settings: %w", settingsErr)
	}

	ledgerService := ledger.New(store, store, store, settingsService, clockSystem, clockSystem)

	built, buildErr := w.dependencies(ctx, store, limits, clockSystem)
	if buildErr != nil {
		_ = store.Close(ctx)

		return buildErr
	}

	w.rates = built.cache

	accounts, err := store.ListAccounts(ctx, entity.AccountFilter{Limit: worldListLimit})
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("accounts: %w", err)
	}

	w.store = store
	w.ledger = ledgerService

	for _, account := range accounts {
		w.accounts[account.Name] = account.Ref
	}

	queue := captures.New(
		store, ledgerService, sealer, artifacts, store, built.extractor, clockSystem, clockSystem,
	)

	w.server = httptest.NewServer(httpcmd.New(handlers.Deps{
		Ledger:        ledgerService,
		Captures:      queue,
		Accounts:      store,
		Payees:        store,
		Recurring:     store,
		Analytics:     store,
		CustomQueries: store,
		Export: export.Deps{
			Ledger:        store,
			Exporter:      store,
			CustomQueries: store,
			Rates:         store,
			System:        store,
			Clock:         clockSystem,
			BaseCurrency:  baseCurrency,
		},
		Artifacts:         store,
		ArtifactFiles:     artifacts,
		Health:            store,
		Settings:          settingsService,
		Rates:             built.rates,
		Sealer:            sealer,
		BaseCurrency:      baseCurrency,
		Version:           "uat",
		HealthTimeout:     limits.HealthTimeout,
		MaxBodyBytes:      limits.MaxBodyBytes,
		MaxArtifactBytes:  limits.ArtifactMaxBytes,
		ExtractionEnabled: w.rail != "",
		Logger:            slog.New(w.logs),
	}))

	return nil
}

func bootRates(
	ctx context.Context,
	endpoint string,
	store *sqlite.Store,
	limits entity.AppConfig,
	clockSystem clock.System,
) (*rates.Service, error) {
	source, err := ecb.New(endpoint, limits.ECBTimeout, clockSystem)
	if err != nil {
		return nil, fmt.Errorf("ecb: %w", err)
	}

	service := rates.New(source, store, clockSystem)

	_, refreshErr := service.Refresh(ctx)

	return service, refreshErr
}

func (w *world) ratesTarget() string {
	return pickEndpoint(w.ratesFault,
		w.options.RatesEndpoint, w.options.RatesDownEndpoint, w.options.RatesBrokenEndpoint)
}

func pickEndpoint(fault faultType, healthy, down, broken string) string {
	switch fault {
	case faultDown:
		return down
	case faultBroken:
		return broken
	case faultNone:
		return healthy
	}

	return healthy
}

type dependencies struct {
	rates     rates.Contract
	cache     *rates.Service
	extractor extraction.Extractor
}

func (w *world) dependencies(
	ctx context.Context,
	store *sqlite.Store,
	limits entity.AppConfig,
	clockSystem clock.System,
) (dependencies, error) {
	var built dependencies

	if target := w.ratesTarget(); target != "" {
		service, ratesErr := bootRates(ctx, target, store, limits, clockSystem)
		if service == nil {
			return dependencies{}, fmt.Errorf("rates: %w", ratesErr)
		}

		built.rates = service
		built.cache = service
	}

	if w.rail == "" {
		return built, nil
	}

	extractor, err := w.newExtractor()
	if err != nil {
		return dependencies{}, err
	}

	built.extractor = extractor

	return built, nil
}

//nolint:ireturn // the two rails share only the Extractor contract; the caller wants no vendor type
func (w *world) newExtractor() (extraction.Extractor, error) {
	switch w.rail {
	case snaptojson.RailName:
		endpoint := pickEndpoint(w.extractionFault,
			w.options.SnapEndpoint, w.options.SnapDownEndpoint, w.options.SnapBrokenEndpoint)

		if endpoint == "" {
			return nil, errors.New("the snaptojson rail needs the mock service: run with Docker")
		}

		return snaptojson.New(endpoint, stubKey, vendorTimeout)
	case openai.RailName:
		base := pickEndpoint(w.extractionFault,
			w.options.OpenAIEndpoint, w.options.OpenAIDownEndpoint, w.options.OpenAIBrokenEndpoint)

		if base == "" {
			return nil, errors.New("the openai rail needs the mock service: run with Docker")
		}

		return openai.New(stubKey, stubModel, base, vendorTimeout)
	default:
		return nil, fmt.Errorf("unknown extraction rail %q", w.rail)
	}
}

func (w *world) clearDatabase(ctx context.Context) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	clearOrder := []string{
		"artifacts",
		"ledger_postings",
		"captures",
		"ledger_entries",
		"audit_log",
		"recurring_rules",
		"custom_queries",
		"payees",
		"fx_rates",
		"accounts",
		"settings",
		"api_tokens",
	}

	for _, table := range clearOrder {
		if _, err := w.store.DB().ExecContext(ctx, `DELETE FROM `+table); err != nil {
			return fmt.Errorf("clear %s: %w", table, err)
		}
	}

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

func (w *world) do(ctx context.Context, method, path string, body []byte) error {
	return w.doWith(ctx, method, path, body, nil, nil)
}

func (w *world) doWith(
	ctx context.Context,
	method, path string,
	body []byte,
	headers http.Header,
	query url.Values,
) error {
	if w.server == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	path, err := w.substituteRefs(path)
	if err != nil {
		return err
	}

	return w.call(ctx, method, path, body, headers, query)
}

func (w *world) call(
	ctx context.Context,
	method, path string,
	body []byte,
	headers http.Header,
	query url.Values,
) error {
	var reader io.Reader

	if body != nil {
		reader = strings.NewReader(string(body))
	}

	target := w.server.URL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := w.server.Client().Do(req)
	if err != nil {
		return fmt.Errorf("call %s %s: %w", method, path, err)
	}

	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}

	w.status = resp.StatusCode
	w.body = raw

	w.header = resp.Header
	if method == http.MethodPost {
		w.lastRef = refOf(raw)
	}

	return nil
}

func refOf(body []byte) string {
	var document map[string]any

	if err := json.Unmarshal(body, &document); err != nil {
		return ""
	}

	for _, key := range []string{"ref", "capture", "entry", "captures", "entries"} {
		switch typed := document[key].(type) {
		case string:
			return typed
		case map[string]any:
			if ref, ok := typed["ref"].(string); ok {
				return ref
			}
		case []any:
			if len(typed) == 0 {
				continue
			}

			if row, ok := typed[0].(map[string]any); ok {
				if ref, ok := row["ref"].(string); ok {
					return ref
				}
			}
		}
	}

	return ""
}

var (
	accountPlaceholder = regexp.MustCompile(`\{\{account:([^}]+)\}\}`)
	refPlaceholder     = regexp.MustCompile(`\{\{ref:([^}]+)\}\}`)
)

func (w *world) expand(body string) (string, error) {
	var missing []string

	out := accountPlaceholder.ReplaceAllStringFunc(body, func(match string) string {
		name := accountPlaceholder.FindStringSubmatch(match)[1]

		ref, ok := w.accounts[name]
		if !ok {
			missing = append(missing, name)

			return match
		}

		return ref
	})

	out, err := w.substituteRefs(out)
	if err != nil {
		return "", err
	}

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown account(s) %s: create them with "the account ... exists as ..."`,
			strings.Join(missing, ", "))
	}

	return out, nil
}

func (w *world) substituteRefs(text string) (string, error) {
	var missing []string

	out := refPlaceholder.ReplaceAllStringFunc(text, func(match string) string {
		name := refPlaceholder.FindStringSubmatch(match)[1]

		ref, ok := w.refs[name]
		if !ok {
			missing = append(missing, name)

			return match
		}

		return ref
	})

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown ref(s) %s: add "the last ref is remembered as ..."`,
			strings.Join(missing, ", "))
	}

	return strings.ReplaceAll(out, "{{ref}}", w.lastRef), nil
}

func (w *world) countTable(ctx context.Context, table string) (int, error) {
	if w.store == nil {
		return 0, errors.New(`no running API: add the step "a running API" first`)
	}

	if !slices.Contains(allowedTables, table) {
		return 0, fmt.Errorf("counting %q is not allowed", table)
	}

	var count int

	//nolint:gosec // G201: the table name is allow-listed immediately above
	query := "SELECT COUNT(*) FROM " + table

	err := w.store.DB().QueryRowContext(ctx, query).Scan(&count)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("count %s: %w", table, err)
	}

	return count, nil
}

func preview(body string) string {
	if len(body) > maxPreview {
		return body[:maxPreview] + "..."
	}

	return body
}

type manifestEntry struct {
	Name string `json:"name"`
	Rows int    `json:"rows"`
}

type manifestReport struct {
	Files []manifestEntry `json:"files"`
}

func (w *world) exportArchive() (*zip.Reader, error) {
	reader, err := zip.NewReader(bytes.NewReader(w.body), int64(len(w.body)))
	if err != nil {
		return nil, fmt.Errorf("the export is not a zip archive (%q): %w", preview(string(w.body)), err)
	}

	return reader, nil
}

func (w *world) exportArchiveHolds(want string) error {
	reader, err := w.exportArchive()
	if err != nil {
		return err
	}

	names := make([]string, 0, len(reader.File))

	for _, file := range reader.File {
		names = append(names, file.Name)
	}

	expected := make([]string, 0)

	for _, name := range strings.Split(want, ",") {
		if trimmed := strings.TrimSpace(name); trimmed != "" {
			expected = append(expected, trimmed)
		}
	}

	if !slices.Equal(names, expected) {
		return fmt.Errorf("the archive holds %v, want %v", names, expected)
	}

	return nil
}

func (w *world) exportManifestRows(name string) (int, error) {
	reader, err := w.exportArchive()
	if err != nil {
		return 0, err
	}

	for _, file := range reader.File {
		if file.Name != "manifest.json" {
			continue
		}

		manifest, readErr := readManifest(file)
		if readErr != nil {
			return 0, readErr
		}

		for _, entry := range manifest.Files {
			if entry.Name == name {
				return entry.Rows, nil
			}
		}

		return 0, fmt.Errorf("the manifest does not report %q", name)
	}

	return 0, errors.New("the archive holds no manifest.json")
}

func readManifest(file *zip.File) (manifestReport, error) {
	body, err := file.Open()
	if err != nil {
		return manifestReport{}, fmt.Errorf("open manifest: %w", err)
	}

	defer func() { _ = body.Close() }()

	var report manifestReport

	if err := json.NewDecoder(body).Decode(&report); err != nil {
		return manifestReport{}, fmt.Errorf("decode manifest: %w", err)
	}

	return report, nil
}
