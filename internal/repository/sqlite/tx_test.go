package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

// newTestDB opens a throwaway database with one table for the transaction tests.
func newTestDB(t *testing.T) *sqlite.Store {
	t.Helper()

	db, err := sqlite.Open(t.Context(), sqlite.Config{Path: filepath.Join(t.TempDir(), "tx.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.ExecContext(t.Context(),
		`CREATE TABLE probe (id INTEGER PRIMARY KEY, note TEXT)`); err != nil {
		t.Fatalf("create table: %v", err)
	}

	return sqlite.NewStore(db)
}

func TestWithTxCommits(t *testing.T) {
	store := newTestDB(t)

	err := store.WithTx(t.Context(), func(ctx context.Context, tx *sql.Tx) error {
		_, execErr := tx.ExecContext(ctx, `INSERT INTO probe (note) VALUES ('committed')`)

		return execErr
	})
	if err != nil {
		t.Fatalf("withTx: %v", err)
	}

	var count int
	if err := store.DB().QueryRowContext(t.Context(), `SELECT COUNT(*) FROM probe`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}

	if count != 1 {
		t.Fatalf("rows = %d, want 1", count)
	}
}

func TestWithTxRollsBackOnError(t *testing.T) {
	store := newTestDB(t)

	sentinel := errors.New("caller said no")

	err := store.WithTx(t.Context(), func(ctx context.Context, tx *sql.Tx) error {
		if _, execErr := tx.ExecContext(ctx, `INSERT INTO probe (note) VALUES ('rolled back')`); execErr != nil {
			return execErr
		}

		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("err = %v, want the caller's error", err)
	}

	var count int
	if err := store.DB().QueryRowContext(t.Context(), `SELECT COUNT(*) FROM probe`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}

	if count != 0 {
		t.Fatalf("rows = %d, want 0 after a rollback", count)
	}
}
