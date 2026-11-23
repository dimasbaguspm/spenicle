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

type Store struct {
	db *sql.DB
}

func New(ctx context.Context, cfg Config) (*Store, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.New")
	defer endSpan()

	db, err := Open(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return NewStore(db), nil
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

func (s *Store) DB() *sql.DB { return s.db }

func (s *Store) Close(ctx context.Context) error {
	_, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Close")
	defer endSpan()

	if err := s.db.Close(); err != nil {
		return fmt.Errorf("close sqlite: %w", err)
	}

	return nil
}

var (
	_ repository.Ledger        = (*Store)(nil)
	_ repository.Captures      = (*Store)(nil)
	_ repository.Accounts      = (*Store)(nil)
	_ repository.System        = (*Store)(nil)
	_ repository.Payees        = (*Store)(nil)
	_ repository.Recurring     = (*Store)(nil)
	_ repository.Analytics     = (*Store)(nil)
	_ repository.CustomQueries = (*Store)(nil)
)
