package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	sqlite "modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type sqlExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

//nolint:ireturn // T is resolved to a concrete entity at every call site
func insertWithEvent[T any](
	ctx context.Context,
	store *Store,
	span string,
	value T,
	empty T,
	insert func(context.Context, sqlExecer, T) (T, error),
	writeEvent func(context.Context, sqlExecer, T) error,
) (T, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, span)
	defer endSpan()

	err := store.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		saved, insertErr := insert(ctx, tx, value)
		if insertErr != nil {
			return insertErr
		}

		if eventErr := writeEvent(ctx, tx, saved); eventErr != nil {
			return eventErr
		}

		value = saved

		return nil
	})
	if err != nil {
		return empty, err
	}

	return value, nil
}

func nullString(v string) sql.NullString {
	if v == "" {
		return sql.NullString{}
	}

	return sql.NullString{String: v, Valid: true}
}

func nullInt(v *int64) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{}
	}

	return sql.NullInt64{Int64: *v, Valid: true}
}

func orDefault(v, fallback string) string {
	if v == "" {
		return fallback
	}

	return v
}

func nullTime(v *time.Time) sql.NullString {
	if v == nil {
		return sql.NullString{}
	}

	return sql.NullString{String: v.UTC().Format(constant.TimestampLayout), Valid: true}
}

func nullDay(v *time.Time) sql.NullString {
	if v == nil {
		return sql.NullString{}
	}

	return sql.NullString{String: v.UTC().Format(constant.DateLayout), Valid: true}
}

func uniqueViolation(err error) error {
	var driverErr *sqlite.Error
	if errors.As(err, &driverErr) && driverErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
		return fmt.Errorf("%w: %s", entity.ErrDuplicate, driverErr.Error())
	}

	return err
}

func requireAccounts(ctx context.Context, db *sql.DB, refs ...string) error {
	for _, ref := range refs {
		if ref == "" {
			continue
		}

		var exists bool
		if err := db.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM accounts WHERE ref = ?)`, ref).Scan(&exists); err != nil {
			return fmt.Errorf("check account %s: %w", ref, err)
		}

		if !exists {
			return fmt.Errorf("%w: account %s", entity.ErrNotFound, ref)
		}
	}

	return nil
}
