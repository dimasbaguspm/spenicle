package uat

import (
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
	"strconv"
	"strings"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const (
	maxPreview = 120

	appSecret = "uat-secret-0123456789"
)

type worldKey struct{}

type world struct {
	baseCurrency  string
	fingerprint   string
	dbPath        string
	store         *sqlite.Store
	server        *httptest.Server
	accounts      map[string]string
	ratesEndpoint string

	status int
	body   []byte
	header http.Header

	pendingBody []byte
	lastRef     string
}

// Options is what the harness injects: the endpoints of the mocked services.
type Options struct {
	RatesEndpoint string
}

func newWorld(options Options) *world {
	return &world{
		baseCurrency:  "IDR",
		accounts:      map[string]string{},
		ratesEndpoint: options.RatesEndpoint,
	}
}

func worldFrom(ctx context.Context) (*world, error) {
	world, ok := ctx.Value(worldKey{}).(*world)
	if !ok {
		return nil, errors.New("scenario world is missing: run through godog")
	}

	return world, nil
}

func (w *world) boot(ctx context.Context) error {
	if w.server != nil {
		return nil
	}

	dir, err := os.MkdirTemp("", "spenicle-uat-")
	if err != nil {
		return fmt.Errorf("temp dir: %w", err)
	}

	w.dbPath = filepath.Join(dir, "spenicle.db")

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

	w.fingerprint = sealer.Fingerprint()

	baseCurrency, err := store.EnsureBaseline(ctx, w.baseCurrency, sealer.Fingerprint())
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("bootstrap: %w", err)
	}

	clockSystem := clock.System{}
	limits := config.Defaults()

	settingsService := settings.New(store, sealer, clockSystem)
	if _, _, settingsErr := settingsService.EnsureInitial(ctx, ""); settingsErr != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("settings: %w", settingsErr)
	}

	ledgerService := ledger.New(store, store, settingsService, clockSystem, clockSystem)

	var ratesService rates.Contract

	if w.ratesEndpoint != "" {
		service, ratesErr := bootRates(ctx, w.ratesEndpoint, store, limits, clockSystem)
		if ratesErr != nil {
			_ = store.Close(ctx)

			return ratesErr
		}

		ratesService = service
	}

	accounts, err := store.ListAccounts(ctx)
	if err != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("accounts: %w", err)
	}

	for _, account := range accounts {
		w.accounts[account.Name] = account.Ref
	}

	w.store = store
	w.server = httptest.NewServer(handlers.New(handlers.Deps{
		Ledger:        ledgerService,
		Captures:      captures.New(store, ledgerService, sealer, nil, clockSystem, clockSystem),
		Accounts:      store,
		Payees:        store,
		Recurring:     store,
		Analytics:     store,
		Health:        store,
		Settings:      settingsService,
		Rates:         ratesService,
		Sealer:        sealer,
		BaseCurrency:  baseCurrency,
		Version:       "uat",
		HealthTimeout: limits.HealthTimeout,
		MaxBodyBytes:  limits.MaxBodyBytes,
		Logger:        slog.New(slog.DiscardHandler),
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

	if _, err := service.Refresh(ctx); err != nil {
		return nil, fmt.Errorf("rates: %w", err)
	}

	return service, nil
}

func (w *world) shutdown(ctx context.Context) {
	if w.server != nil {
		w.server.Close()
	}

	if w.store != nil {
		_ = w.store.Close(ctx)
	}

	if w.dbPath != "" {
		_ = os.RemoveAll(filepath.Dir(w.dbPath))
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

	var reader io.Reader

	if body != nil {
		reader = strings.NewReader(string(body))
	}

	path = strings.ReplaceAll(path, "{{ref}}", w.lastRef)

	target := w.server.URL + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
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

var accountPlaceholder = regexp.MustCompile(`\{\{account:([^}]+)\}\}`)

func (w *world) expandFingerprint(want string) string {
	want = strings.ReplaceAll(want, "{{fingerprint}}", w.fingerprint)
	want = strings.ReplaceAll(want, "{{ref}}", w.lastRef)

	return accountPlaceholder.ReplaceAllStringFunc(want, func(match string) string {
		ref, ok := w.accounts[accountPlaceholder.FindStringSubmatch(match)[1]]
		if !ok {
			return match
		}

		return ref
	})
}

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

	out = strings.ReplaceAll(out, "{{ref}}", w.lastRef)

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown account(s) %s: create them with "the account ... exists as ..."`,
			strings.Join(missing, ", "))
	}

	return out, nil
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

func (w *world) jsonPath(path string) (string, error) {
	var document any

	if err := json.Unmarshal(w.body, &document); err != nil {
		return "", fmt.Errorf("response is not JSON (%q): %w", preview(string(w.body)), err)
	}

	value, err := walk(path, document)
	if err != nil {
		return "", err
	}

	switch typed := value.(type) {
	case string:
		return typed, nil
	case nil:
		return "", nil
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64), nil
	case bool:
		return strconv.FormatBool(typed), nil
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return "", fmt.Errorf("encode %s: %w", path, err)
		}

		return string(encoded), nil
	}
}

func walk(path string, document any) (any, error) {
	current := document

	for _, token := range tokenize(path) {
		next, err := step(path, current, token)
		if err != nil {
			return nil, err
		}

		current = next
	}

	return current, nil
}

func step(path string, current any, token string) (any, error) {
	switch node := current.(type) {
	case map[string]any:
		value, ok := node[token]
		if !ok {
			return nil, fmt.Errorf("path %s: key %q not present", path, token)
		}

		return value, nil
	case []any:
		index, err := strconv.Atoi(token)
		if err != nil {
			return nil, fmt.Errorf("path %s: %q is not an array index", path, token)
		}

		if index < 0 || index >= len(node) {
			return nil, fmt.Errorf("path %s: index %d out of range (%d items)", path, index, len(node))
		}

		return node[index], nil
	default:
		return nil, fmt.Errorf("path %s: cannot descend into %T at %q", path, current, token)
	}
}

func tokenize(path string) []string {
	path = strings.TrimSpace(path)
	path = strings.TrimPrefix(path, "$")
	path = strings.TrimPrefix(path, ".")

	var tokens []string

	for _, part := range strings.Split(path, ".") {
		if part == "" {
			continue
		}

		tokens = append(tokens, splitBrackets(part)...)
	}

	return tokens
}

func splitBrackets(part string) []string {
	var tokens []string

	for {
		open := strings.IndexByte(part, '[')
		if open < 0 {
			return append(tokens, part)
		}

		if open > 0 {
			tokens = append(tokens, part[:open])
		}

		closing := strings.IndexByte(part, ']')
		if closing < 0 {
			return append(tokens, part[open+1:])
		}

		tokens = append(tokens, part[open+1:closing])

		part = part[closing+1:]
		if part == "" {
			return tokens
		}
	}
}

func preview(body string) string {
	if len(body) > maxPreview {
		return body[:maxPreview] + "..."
	}

	return body
}
