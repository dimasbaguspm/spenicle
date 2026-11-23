package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

// WithTx is the one way this package writes more than one row: the callback gets a
// transaction, and the commit happens only when it returns nil. A returned error is
// passed through untouched so the caller keeps its own sentinel; a rollback is
// always attempted, so a failed callback cannot leave the file locked.
//
// It is exported because the pattern is worth reusing in a test and in the next
// write path, and because "how does this project do transactions" should have one
// answer that can be pointed at.
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
