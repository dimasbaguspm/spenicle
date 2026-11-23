// Package bdd drives the HTTP contract with Gherkin. Steps stay dumb: they
// speak HTTP, JSON and SQL, never domain rules, so the same vocabulary can
// describe any future endpoint without touching this package.
package bdd

import (
	"context"
	"database/sql"
	"encoding/json"
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
	w, ok := ctx.Value(worldKey{}).(*world)
	if !ok {
		return nil, fmt.Errorf("scenario world is missing: run through godog")
	}
	return w, nil
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
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	application, err := app.New(context.Background(), app.Config{
		DBPath:       w.dbPath,
		BaseCurrency: w.baseCurrency,
		Sealer:       seal.Passthrough{},
		Logger:       logger,
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
		return fmt.Errorf("no running API: add the step \"a running API\" first")
	}

	var reader io.Reader
	if body != nil {
		reader = strings.NewReader(string(body))
	}

	req, err := http.NewRequest(method, w.server.URL+path, reader)
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
		return "", fmt.Errorf("unknown account(s) %s: create them with \"the account ... exists as ...\"",
			strings.Join(missing, ", "))
	}
	return out, nil
}

// countTable answers "how many rows in this table", used by the store steps.
func (w *world) countTable(table string) (int, error) {
	if w.app == nil {
		return 0, fmt.Errorf("no running API: add the step \"a running API\" first")
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

	var n int
	query := "SELECT COUNT(*) FROM " + table // table name is allow-listed above
	err := w.app.DB.QueryRowContext(context.Background(), query).Scan(&n)
	if err != nil && err != sql.ErrNoRows {
		return 0, fmt.Errorf("count %s: %w", table, err)
	}
	return n, nil
}

// jsonPath resolves $.a.b[0].c against the recorded body.
func (w *world) jsonPath(path string) (string, error) {
	var doc any
	if err := json.Unmarshal(w.body, &doc); err != nil {
		return "", fmt.Errorf("response is not JSON (%q): %w", truncate(string(w.body)), err)
	}

	cur := doc
	for _, token := range tokenize(path) {
		switch node := cur.(type) {
		case map[string]any:
			value, ok := node[token]
			if !ok {
				return "", fmt.Errorf("path %s: key %q not present", path, token)
			}
			cur = value
		case []any:
			index, err := strconv.Atoi(token)
			if err != nil {
				return "", fmt.Errorf("path %s: %q is not an array index", path, token)
			}
			if index < 0 || index >= len(node) {
				return "", fmt.Errorf("path %s: index %d out of range (%d items)", path, index, len(node))
			}
			cur = node[index]
		default:
			return "", fmt.Errorf("path %s: cannot descend into %T at %q", path, cur, token)
		}
	}

	switch v := cur.(type) {
	case string:
		return v, nil
	case nil:
		return "", nil
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), nil
	case bool:
		return strconv.FormatBool(v), nil
	default:
		encoded, err := json.Marshal(v)
		if err != nil {
			return "", err
		}
		return string(encoded), nil
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
		for {
			open := strings.IndexByte(part, '[')
			if open < 0 {
				tokens = append(tokens, part)
				break
			}
			if open > 0 {
				tokens = append(tokens, part[:open])
			}
			closeIdx := strings.IndexByte(part, ']')
			if closeIdx < 0 {
				tokens = append(tokens, part[open+1:])
				break
			}
			tokens = append(tokens, part[open+1:closeIdx])
			part = part[closeIdx+1:]
			if part == "" {
				break
			}
		}
	}
	return tokens
}

func truncate(s string) string {
	if len(s) > 120 {
		return s[:120] + "..."
	}
	return s
}
