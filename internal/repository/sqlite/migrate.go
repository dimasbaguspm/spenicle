package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"errors"
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

var ErrUnsupportedSchema = errors.New("unsupported schema version")

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

	if err := rejectUnsupported(applied, names); err != nil {
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
	conn, err := db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("connect migration %d: %w", version, err)
	}

	var foreignKeys int

	if queryErr := conn.QueryRowContext(ctx, `PRAGMA foreign_keys`).Scan(&foreignKeys); queryErr != nil {
		return errors.Join(fmt.Errorf("read foreign keys for migration %d: %w", version, queryErr),
			conn.Close())
	}

	cleanup := func() error {
		_, restoreErr := conn.ExecContext(context.WithoutCancel(ctx),
			`PRAGMA foreign_keys = `+strconv.Itoa(foreignKeys))
		closeErr := conn.Close()

		if restoreErr != nil {
			restoreErr = fmt.Errorf("restore foreign keys after migration %d: %w", version, restoreErr)
		}

		if closeErr != nil {
			closeErr = fmt.Errorf("close migration %d connection: %w", version, closeErr)
		}

		return errors.Join(restoreErr, closeErr)
	}

	if _, disableErr := conn.ExecContext(ctx, `PRAGMA foreign_keys = OFF`); disableErr != nil {
		return errors.Join(fmt.Errorf("disable foreign keys for migration %d: %w", version, disableErr),
			cleanup())
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return errors.Join(fmt.Errorf("begin migration %d: %w", version, err), cleanup())
	}

	applyErr := applyMigration(ctx, tx, version, body)
	if applyErr == nil {
		applyErr = tx.Commit()
		if applyErr != nil {
			applyErr = fmt.Errorf("commit migration %d: %w", version, applyErr)
		}
	}

	rollbackErr := tx.Rollback()
	if rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
		rollbackErr = fmt.Errorf("rollback migration %d: %w", version, rollbackErr)
	} else {
		rollbackErr = nil
	}

	return errors.Join(applyErr, rollbackErr, cleanup())
}

func applyMigration(ctx context.Context, tx *sql.Tx, version int, body string) error {
	recorded, err := alreadyApplied(ctx, tx, version)
	if err != nil {
		return err
	}

	if recorded {
		return nil
	}

	for _, stmt := range splitStatements(body) {
		if _, execErr := tx.ExecContext(ctx, stmt); execErr != nil {
			return fmt.Errorf("statement %q: %w", firstLine(stmt), execErr)
		}
	}

	if err := checkForeignKeys(ctx, tx); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`,
		version, time.Now().UTC().Format(time.RFC3339)); err != nil {
		return fmt.Errorf("record migration %d: %w", version, err)
	}

	return nil
}

func checkForeignKeys(ctx context.Context, tx *sql.Tx) error {
	rows, err := tx.QueryContext(ctx, `PRAGMA foreign_key_check`)
	if err != nil {
		return fmt.Errorf("check foreign keys: %w", err)
	}

	defer func() { _ = rows.Close() }()

	if rows.Next() {
		var table, parent string

		var rowID, constraintID sql.NullInt64

		if scanErr := rows.Scan(&table, &rowID, &parent, &constraintID); scanErr != nil {
			return fmt.Errorf("scan foreign key violation: %w", scanErr)
		}

		return fmt.Errorf("foreign key violation: table %q row %d references %q",
			table, rowID.Int64, parent)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate foreign key violations: %w", err)
	}

	return nil
}

func alreadyApplied(ctx context.Context, tx *sql.Tx, version int) (bool, error) {
	var one int

	err := tx.QueryRowContext(ctx, `SELECT 1 FROM schema_migrations WHERE version = ?`, version).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}

	if err != nil {
		return false, fmt.Errorf("check migration %d: %w", version, err)
	}

	return true, nil
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

func rejectUnsupported(applied map[int]bool, names []string) error {
	supported := make(map[int]bool, len(names))
	current := 0

	for _, name := range names {
		version, err := versionOf(name)
		if err != nil {
			return err
		}

		supported[version] = true
		if version > current {
			current = version
		}
	}

	unsupported := make([]int, 0, len(applied))
	for version := range applied {
		if !supported[version] {
			unsupported = append(unsupported, version)
		}
	}

	if len(unsupported) == 0 {
		return nil
	}

	sort.Ints(unsupported)

	return fmt.Errorf("%w %d: this build has schema version %d and does not upgrade an existing database; "+
		"move the old database aside and start with a fresh one",
		ErrUnsupportedSchema, unsupported[0], current)
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
