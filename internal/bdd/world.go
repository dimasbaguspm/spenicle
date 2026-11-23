// Package bdd drives the HTTP contract with Gherkin. Steps stay dumb: they
// speak HTTP, JSON and SQL, never domain rules, so the same vocabulary can
// describe any future endpoint without touching this package.
package bdd

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

	"github.com/dimasbaguspm/spenicle/internal/app"
	"github.com/dimasbaguspm/spenicle/internal/platform/seal"
)

const (
	// maxPreview bounds what a failure message can dump into the log.
	maxPreview = 120
)

type worldKey struct{}

// world is the per-scenario state. Everything a step needs is reachable from it.
type world struct {
	baseCurrency string
	dbPath       string
	app          *app.App
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
func (w *world) boot() error {
	if w.server != nil {
		return nil
	}

	dir, err := os.MkdirTemp("", "spenicle-bdd-")
	if err != nil {
		return fmt.Errorf("temp dir: %w", err)
	}

	w.dbPath = filepath.Join(dir, "spenicle.db")

	application, err := app.New(context.Background(), app.Config{
		DBPath:       w.dbPath,
		BaseCurrency: w.baseCurrency,
		Sealer:       seal.Passthrough{},
		Logger:       slog.New(slog.DiscardHandler),
	})
	if err != nil {
		return fmt.Errorf("app: %w", err)
	}

	w.app = application
	w.server = httptest.NewServer(application.Handler)

	return nil
}

func (w *world) shutdown() {
	if w.server != nil {
		w.server.Close()
	}

	if w.app != nil {
		_ = w.app.Close()
	}

	if w.dbPath != "" {
		_ = os.RemoveAll(filepath.Dir(w.dbPath))
	}
}

// do performs one HTTP request and records it for the Then steps.
func (w *world) do(method, path string, body []byte) error {
	if w.server == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	var reader io.Reader

	if body != nil {
		reader = strings.NewReader(string(body))
	}

	req, err := http.NewRequestWithContext(context.Background(), method, w.server.URL+path, reader)
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
func (w *world) countTable(table string) (int, error) {
	if w.app == nil {
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

	err := w.app.DB.QueryRowContext(context.Background(), query).Scan(&count)
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
