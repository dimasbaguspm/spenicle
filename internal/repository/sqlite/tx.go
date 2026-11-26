package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

const (
	txLockAttempts = 2
	txLockBackoff  = 25 * time.Millisecond
)

type txKey struct{}

func (s *Store) WithTx(ctx context.Context, fn func(context.Context, *sql.Tx) error) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.WithTx")
	defer endSpan()

	if tx, ok := txFrom(ctx); ok {
		return fn(ctx, tx)
	}

	var tx *sql.Tx

	err := retryLocked(ctx, telemetry.OperationBegin, func() error {
		var err error

		tx, err = s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin tx: %w", err)
		}

		return nil
	})
	if err != nil {
		return err
	}

	defer func() { _ = tx.Rollback() }()

	if err := fn(context.WithValue(ctx, txKey{}, tx), tx); err != nil {
		if isLocked(err) {
			telemetry.RecordSQLiteLocked(ctx, telemetry.OperationWrite)
		}

		return err
	}

	if err := retryLocked(ctx, telemetry.OperationCommit, tx.Commit); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	return nil
}

func retryLocked(ctx context.Context, operation string, fn func() error) error {
	var locked error

	for attempt := range txLockAttempts {
		err := fn()
		if err == nil {
			return nil
		}

		if !isLocked(err) {
			return err
		}

		telemetry.RecordSQLiteLocked(ctx, operation)

		locked = err

		if attempt+1 == txLockAttempts {
			break
		}

		timer := time.NewTimer(txLockBackoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			return fmt.Errorf("wait for sqlite lock: %w", ctx.Err())
		case <-timer.C:
		}
	}

	return locked
}

func txFrom(ctx context.Context) (*sql.Tx, bool) {
	tx, ok := ctx.Value(txKey{}).(*sql.Tx)

	return tx, ok
}
