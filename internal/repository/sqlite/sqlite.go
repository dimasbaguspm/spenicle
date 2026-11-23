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

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

// Store is the SQLite implementation of every repository contract this project
// needs today. One struct, because they all share the same file handle.
type Store struct {
	db *sql.DB
}

// spanPrefix names every database call Repository.Sqlite.<method>, so a trace
// reads like the call stack and a slow query is one filter away.
const spanPrefix = "Repository.Sqlite."

// startSpan is the single place this package spells its span names.
func startSpan(ctx context.Context, method string) (context.Context, func()) {
	return telemetry.StartSpan(ctx, spanPrefix+method)
}

// New opens (or creates) the database and returns a store satisfying every
// repository contract.
func New(ctx context.Context, cfg Config) (*Store, error) {
	ctx, endSpan := startSpan(ctx, "New")
	defer endSpan()

	db, err := Open(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return NewStore(db), nil
}

// NewStore wraps an existing handle. Migrating is the caller's step.
func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// DB exposes the handle for migration and for tests that assert on rows. It is
// an accessor, not a unit of work, so it opens no span.
func (s *Store) DB() *sql.DB { return s.db }

// Close releases the file. WAL checkpoints on the way out.
func (s *Store) Close(ctx context.Context) error {
	_, endSpan := startSpan(ctx, "Close")
	defer endSpan()

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
