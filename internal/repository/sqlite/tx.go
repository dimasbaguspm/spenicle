package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

type txKey struct{}

func (s *Store) WithTx(ctx context.Context, fn func(context.Context, *sql.Tx) error) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.WithTx")
	defer endSpan()

	if tx, ok := txFrom(ctx); ok {
		return fn(ctx, tx)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}

	defer func() { _ = tx.Rollback() }()

	if err := fn(context.WithValue(ctx, txKey{}, tx), tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}

func txFrom(ctx context.Context) (*sql.Tx, bool) {
	tx, ok := ctx.Value(txKey{}).(*sql.Tx)

	return tx, ok
}
