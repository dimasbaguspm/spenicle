package sqlite

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	sqlite "modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

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

func intPtr(v sql.NullInt64) *int64 {
	if !v.Valid {
		return nil
	}

	value := v.Int64

	return &value
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
