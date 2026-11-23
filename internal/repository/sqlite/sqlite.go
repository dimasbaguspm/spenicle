// Package sqlite is the driven adapter for the database. It owns the file, the
// schema and the SQL; nothing outside this package knows SQLite exists.
//
// This file is the package's public surface: the store, how to build one, and
// the promise that it satisfies every repository contract. The queries live in
// store_ledger.go, store_accounts.go and store_system.go.
package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/repository"
)

// Store is the SQLite implementation of every repository contract this project
// needs today. One struct, because they all share the same file handle.
type Store struct {
	db *sql.DB
}

// New opens (or creates) the database and returns a store satisfying all four
// contracts.
func New(ctx context.Context, cfg Config) (*Store, error) {
	db, err := Open(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return NewStore(db), nil
}

// NewStore wraps an existing handle. Migrating is the caller's step.
func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// DB exposes the handle for migration and for tests that assert on rows.
func (s *Store) DB() *sql.DB { return s.db }

// Close releases the file. WAL checkpoints on the way out.
func (s *Store) Close() error {
	if err := s.db.Close(); err != nil {
		return fmt.Errorf("close sqlite: %w", err)
	}

	return nil
}

var (
	_ repository.Ledger   = (*Store)(nil)
	_ repository.Accounts = (*Store)(nil)
	_ repository.System   = (*Store)(nil)
)
