package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

func (s *Store) WithTx(ctx context.Context, fn func(context.Context, *sql.Tx) error) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.WithTx")
	defer endSpan()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}

	defer func() { _ = tx.Rollback() }()

	if err := fn(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}
