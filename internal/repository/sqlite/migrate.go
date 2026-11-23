package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

const (
	maxErrLineWidth = 60
)

func Migrate(ctx context.Context, db *sql.DB) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Migrate")
	defer endSpan()

	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    INTEGER PRIMARY KEY,
			applied_at TEXT NOT NULL
		)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	applied, err := appliedVersions(ctx, db)
	if err != nil {
		return err
	}

	names, err := migrationNames()
	if err != nil {
		return err
	}

	for _, name := range names {
		version, versionErr := versionOf(name)
		if versionErr != nil {
			return versionErr
		}

		if applied[version] {
			continue
		}

		body, readErr := migrationFS.ReadFile("migrations/" + name)
		if readErr != nil {
			return fmt.Errorf("read migration %s: %w", name, readErr)
		}

		if applyErr := applyOne(ctx, db, version, string(body)); applyErr != nil {
			return fmt.Errorf("apply migration %s: %w", name, applyErr)
		}
	}

	return nil
}

func applyOne(ctx context.Context, db *sql.DB, version int, body string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %d: %w", version, err)
	}

	defer func() { _ = tx.Rollback() }()

	for _, stmt := range splitStatements(body) {
		if _, execErr := tx.ExecContext(ctx, stmt); execErr != nil {
			return fmt.Errorf("statement %q: %w", firstLine(stmt), execErr)
		}
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
		version, time.Now().UTC().Format(time.RFC3339)); err != nil {
		return fmt.Errorf("record migration %d: %w", version, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %d: %w", version, err)
	}

	return nil
}

func appliedVersions(ctx context.Context, db *sql.DB) (map[int]bool, error) {
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("read applied migrations: %w", err)
	}

	defer func() { _ = rows.Close() }()

	applied := map[int]bool{}

	for rows.Next() {
		var version int
		if scanErr := rows.Scan(&version); scanErr != nil {
			return nil, fmt.Errorf("scan migration version: %w", scanErr)
		}

		applied[version] = true
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate migrations: %w", err)
	}

	return applied, nil
}

func migrationNames() ([]string, error) {
	entries, err := fs.ReadDir(migrationFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("list migrations: %w", err)
	}

	names := make([]string, 0, len(entries))

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			names = append(names, entry.Name())
		}
	}

	sort.Strings(names)

	return names, nil
}

func versionOf(name string) (int, error) {
	idx := strings.IndexByte(name, '_')
	if idx < 1 {
		return 0, fmt.Errorf("migration %q needs a numeric prefix", name)
	}

	version, err := strconv.Atoi(name[:idx])
	if err != nil {
		return 0, fmt.Errorf("migration %q has a bad prefix: %w", name, err)
	}

	return version, nil
}

func splitStatements(body string) []string {
	parts := strings.Split(body, ";")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		if stmt := strings.TrimSpace(part); stmt != "" {
			out = append(out, stmt)
		}
	}

	return out
}

func firstLine(stmt string) string {
	if idx := strings.IndexByte(stmt, '\n'); idx >= 0 {
		return stmt[:idx]
	}

	if len(stmt) > maxErrLineWidth {
		return stmt[:maxErrLineWidth]
	}

	return stmt
}
