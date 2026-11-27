package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/common/actor"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) RecordSystemStart(ctx context.Context, event entity.SystemStarted) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RecordSystemStart")
	defer endSpan()

	ctx = actor.With(ctx, actor.From{Kind: constant.AuditActorSystem})

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntitySystem,
			Action: constant.AuditActionStart,
			To:     event,
		})
	})
}

func (s *Store) SchemaVersion(ctx context.Context) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SchemaVersion")
	defer endSpan()

	var v sql.NullInt64

	err := s.db.QueryRowContext(ctx, `SELECT MAX(version) FROM schema_migrations`).Scan(&v)
	if err != nil {
		return 0, fmt.Errorf("schema version: %w", err)
	}

	return int(v.Int64), nil
}

func (s *Store) Ping(ctx context.Context) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Ping")
	defer endSpan()

	var one int
	if err := s.db.QueryRowContext(ctx, `SELECT 1`).Scan(&one); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	return nil
}

func (s *Store) OptimizeStats(ctx context.Context) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.OptimizeStats")
	defer endSpan()

	if _, err := s.db.ExecContext(ctx, `PRAGMA optimize`); err != nil {
		return fmt.Errorf("optimize statistics: %w", err)
	}

	return nil
}

func (s *Store) Setting(ctx context.Context, key string) (string, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Setting")
	defer endSpan()

	var v string

	err := s.db.QueryRowContext(ctx, `SELECT v FROM settings WHERE k = ?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf("setting %q: %w", key, err)
	}

	return v, true, nil
}

func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SetSetting")
	defer endSpan()

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO settings (ref, k, v) VALUES (?, ?, ?)
			ON CONFLICT (k) DO UPDATE SET v = excluded.v`, uuid.New(), key, value); err != nil {
			return fmt.Errorf("set setting %q: %w", key, err)
		}

		return auditSetting(ctx, tx, key, constant.AuditActionUpdate)
	})
}

func (s *Store) CreateSetting(ctx context.Context, key, value string) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateSetting")
	defer endSpan()

	var inserted bool

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		result, execErr := tx.ExecContext(ctx, `
			INSERT INTO settings (ref, k, v) VALUES (?, ?, ?)
			ON CONFLICT (k) DO NOTHING`, uuid.New(), key, value)
		if execErr != nil {
			return fmt.Errorf("create setting %q: %w", key, execErr)
		}

		affected, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("create setting %q: %w", key, rowsErr)
		}

		inserted = affected == 1

		if !inserted {
			return nil
		}

		return auditSetting(ctx, tx, key, constant.AuditActionCreate)
	})
	if err != nil {
		return false, err
	}

	return inserted, nil
}

// auditActionOf names the transition a capture update performs; the extraction
// states are an update, the resolved ones are the decisions a journal wants.
func auditActionOf(status string) string {
	switch status {
	case constant.CaptureStatusApproved:
		return constant.AuditActionApprove
	case constant.CaptureStatusRejected:
		return constant.AuditActionReject
	default:
		return constant.AuditActionUpdate
	}
}

// auditSetting journals the key and never the value: a settings value can be the
// sealed app_settings envelope, and the journal is not a second copy of it. The
// key travels in the payload, not in entity_ref, because entity_ref holds a ref.
func auditSetting(ctx context.Context, tx *sql.Tx, key, action string) error {
	if key == constant.SettingWorkerLastRunAt {
		// the heartbeat is a metric every worker run writes, not an event
		return nil
	}

	return appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntitySetting,
		Action: action,
		To:     entity.SettingChanged{Key: key},
	})
}
