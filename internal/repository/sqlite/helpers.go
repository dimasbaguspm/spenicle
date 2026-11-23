package sqlite

import (
	"database/sql"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
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
