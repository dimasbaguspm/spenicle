package uat

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
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
	"artifacts",
	"audit_log",
	"capture_payloads",
	"captures",
	"fx_rates",
	"import_batches",
	"import_rows",
	"import_upload_chunks",
	"import_uploads",
	"ledger_entries",
	"ledger_postings",
	"settings",
}

var timestampPattern = regexp.MustCompile(`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z`)

var refPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

var refInText = regexp.MustCompile(`(^|[^0-9a-f])([0-9a-f]{32})([^0-9a-f]|$)`)

// statePattern is a signed OAuth state: the issuing second, a dot, then an HMAC.
var statePattern = regexp.MustCompile(`\d{9,11}\.[0-9a-f]{64}`)

func (w *world) assertAPISnapshot(name string) error {
	var document any
	if err := json.Unmarshal(w.body, &document); err != nil {
		return fmt.Errorf("response is not JSON (%q): %w", preview(string(w.body)), err)
	}

	if err := walkContract("$", document); err != nil {
		return err
	}

	normalised := normalise(document)

	sum := sha256.Sum256([]byte(fmt.Sprintf("%v", normalised)))
	name = strings.ReplaceAll(name, "{{bodyhash}}", hex.EncodeToString(sum[:4]))

	return compareSnapshot(filepath.Join(snapshotRoot, "api", name+".json"), normalised)
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
