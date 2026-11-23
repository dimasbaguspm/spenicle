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
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const (
	// maxPreview bounds what a failure message can dump into the log.
	maxPreview = 120

	// appSecret is the UAT secret. It seals nothing that is asserted on, but the
	// process refuses to boot without one, so the harness needs a real value.
	appSecret = "uat-secret-0123456789"
)

type worldKey struct{}

// world is the per-scenario state. Everything a step needs is reachable from it.
type world struct {
	baseCurrency string
	fingerprint  string
	dbPath       string
	store        *sqlite.Store
	server       *httptest.Server
	accounts     map[string]int64

	status int
	body   []byte
	header http.Header
}

func newWorld() *world {
	return &world{
		baseCurrency: "IDR",
		accounts:     map[string]int64{},
	}
}

func worldFrom(ctx context.Context) (*world, error) {
	world, ok := ctx.Value(worldKey{}).(*world)
	if !ok {
		return nil, errors.New("scenario world is missing: run through godog")
	}

	return world, nil
}

// boot starts the real HTTP handler over the real SQLite file in a temp dir.
// No mocks: a step that passes here has been proven against the shipped code.
//
// The wiring mirrors cmd/http/bootstrap.go, which is package main and therefore
// not importable. Adding a dependency to the composition root means adding it
// here too.
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
	if _, settingsErr := settingsService.EnsureInitial(ctx, ""); settingsErr != nil {
		_ = store.Close(ctx)

		return fmt.Errorf("settings: %w", settingsErr)
	}

	ledgerService := ledger.New(store, settingsService, clockSystem, clockSystem)

	w.store = store
	w.server = httptest.NewServer(handlers.New(handlers.Deps{
		Ledger:        ledgerService,
		Captures:      captures.New(store, ledgerService, sealer, nil, clockSystem, clockSystem),
		Accounts:      store,
		Health:        store,
		Settings:      settingsService,
		Sealer:        sealer,
		BaseCurrency:  baseCurrency,
		Version:       "uat",
		HealthTimeout: limits.HealthTimeout,
		MaxBodyBytes:  limits.MaxBodyBytes,
		Logger:        slog.New(slog.DiscardHandler),
	}))

	return nil
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

// do performs one HTTP request and records it for the Then steps.
func (w *world) do(ctx context.Context, method, path string, body []byte) error {
	if w.server == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	var reader io.Reader

	if body != nil {
		reader = strings.NewReader(string(body))
	}

	req, err := http.NewRequestWithContext(ctx, method, w.server.URL+path, reader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	if body != nil {
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

	return nil
}

var accountPlaceholder = regexp.MustCompile(`\{\{account:([^}]+)\}\}`)

// expandFingerprint substitutes {{fingerprint}} with this scenario's sealed
// fingerprint, so a feature can assert "the data is sealed" without hard-coding a
// digest that depends on the harness secret.
func (w *world) expandFingerprint(want string) string {
	return strings.ReplaceAll(want, "{{fingerprint}}", w.fingerprint)
}

// expand substitutes {{account:Name}} with the id recorded for that account.
// A placeholder, not a DSL: the step still just sends a body.
func (w *world) expand(body string) (string, error) {
	var missing []string

	out := accountPlaceholder.ReplaceAllStringFunc(body, func(match string) string {
		name := accountPlaceholder.FindStringSubmatch(match)[1]

		id, ok := w.accounts[name]
		if !ok {
			missing = append(missing, name)

			return match
		}

		return strconv.FormatInt(id, 10)
	})

	if len(missing) > 0 {
		return "", fmt.Errorf(`unknown account(s) %s: create them with "the account ... exists as ..."`,
			strings.Join(missing, ", "))
	}

	return out, nil
}

// countTable answers "how many rows in this table", used by the store steps.
func (w *world) countTable(ctx context.Context, table string) (int, error) {
	if w.store == nil {
		return 0, errors.New(`no running API: add the step "a running API" first`)
	}

	allowed := map[string]bool{
		"ledger_entries":  true,
		"ledger_postings": true,
		"accounts":        true,
		"captures":        true,
		"audit_log":       true,
		"settings":        true,
	}

	if !allowed[table] {
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

// jsonPath resolves $.a.b[0].c against the recorded body.
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

// walk descends one token at a time, reporting where it lost the trail.
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

// splitBrackets turns "postings[0]" into ["postings", "0"].
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
