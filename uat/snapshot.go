package uat

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

const snapshotRoot = "snapshots"

const snapshotEnv = "UAT_UPDATE_SNAPSHOTS"

const snapshotDirPerm = 0o750

var allowedTables = []string{
	"accounts",
	"audit_log",
	"captures",
	"fx_rates",
	"ledger_entries",
	"ledger_postings",
	"settings",
}

var timestampPattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`)

var refPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

func (w *world) assertAPISnapshot(name string) error {
	var document any
	if err := json.Unmarshal(w.body, &document); err != nil {
		return fmt.Errorf("response is not JSON (%q): %w", preview(string(w.body)), err)
	}

	return compareSnapshot(filepath.Join(snapshotRoot, "api", name+".json"), normalise(document))
}

func (w *world) assertDBSnapshot(ctx context.Context, name string) error {
	if w.store == nil {
		return errors.New(`no running API: add the step "a running API" first`)
	}

	dump := map[string]any{}

	for _, table := range allowedTables {
		rows, err := dumpTable(ctx, w.store.DB(), table)
		if err != nil {
			return err
		}

		dump[table] = rows
	}

	return compareSnapshot(filepath.Join(snapshotRoot, "db", name+".json"), normalise(dump))
}

func dumpTable(ctx context.Context, db *sql.DB, table string) ([]any, error) {
	columns, err := tableColumns(ctx, db, table)
	if err != nil {
		return nil, err
	}

	//nolint:gosec // G201: the table and columns come from allowedTables, never from a request
	query := fmt.Sprintf("SELECT %s FROM %s ORDER BY rowid", strings.Join(columns, ", "), table)

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("dump %s: %w", table, err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]any, 0)

	for rows.Next() {
		values := make([]any, len(columns))
		targets := make([]any, len(columns))

		for index := range values {
			targets[index] = &values[index]
		}

		if err := rows.Scan(targets...); err != nil {
			return nil, fmt.Errorf("scan %s: %w", table, err)
		}

		row := make(map[string]any, len(columns))
		for index, column := range columns {
			row[column] = values[index]
		}

		out = append(out, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate %s: %w", table, err)
	}

	return out, nil
}

func tableColumns(ctx context.Context, db *sql.DB, table string) ([]string, error) {
	rows, err := db.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return nil, fmt.Errorf("columns of %s: %w", table, err)
	}

	defer func() { _ = rows.Close() }()

	var columns []string

	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue any
			pk        int
		)

		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return nil, fmt.Errorf("scan column of %s: %w", table, err)
		}

		columns = append(columns, name)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate columns of %s: %w", table, err)
	}

	sort.Strings(columns)

	return columns, nil
}

func compareSnapshot(path string, actual any) error {
	var buffer bytes.Buffer

	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(actual); err != nil {
		return fmt.Errorf("encode snapshot: %w", err)
	}

	rendered := buffer.Bytes()

	expected, readErr := os.ReadFile(path)
	if readErr == nil && !updatingSnapshots() {
		if bytes.Equal(expected, rendered) {
			return nil
		}

		return fmt.Errorf("snapshot %s differs\n--- want\n%s\n--- got\n%s", path, expected, rendered)
	}

	if readErr != nil && !os.IsNotExist(readErr) {
		return fmt.Errorf("read snapshot %s: %w", path, readErr)
	}

	if err := os.MkdirAll(filepath.Dir(path), snapshotDirPerm); err != nil {
		return fmt.Errorf("create snapshot dir: %w", err)
	}

	//nolint:forbidigo // golden files are repository content, not DATA_DIR artifacts
	if err := os.WriteFile(path, rendered, 0o600); err != nil {
		return fmt.Errorf("write snapshot %s: %w", path, err)
	}

	if readErr != nil && !updatingSnapshots() {
		return fmt.Errorf("snapshot %s did not exist and was written; review it and re-run", path)
	}

	return nil
}

func updatingSnapshots() bool {
	//nolint:forbidigo // a test toggle, read here on purpose; not application configuration
	value := strings.ToLower(strings.TrimSpace(os.Getenv(snapshotEnv)))

	return value != "" && value != "0" && value != "false"
}

func normalise(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))

		for key, inner := range typed {
			switch key {
			case "version":
				out[key] = "<version>"
			case "app_secret":
				out[key] = "<fingerprint>"
			default:
				out[key] = normalise(inner)
			}
		}

		return out
	case []any:
		out := make([]any, len(typed))
		for index, inner := range typed {
			out[index] = normalise(inner)
		}

		return out
	case string:
		return normaliseString(typed)
	default:
		return value
	}
}

func normaliseString(value string) string {
	if timestampPattern.MatchString(value) {
		return "<timestamp>"
	}

	if strings.HasPrefix(value, "v1:") {
		return "<sealed>"
	}

	if refPattern.MatchString(value) {
		return "<ref>"
	}

	return value
}
