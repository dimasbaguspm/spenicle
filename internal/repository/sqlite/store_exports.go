package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const exportColumns = `id, ref, client_id, status, format, schema_version, counts_json,
	file_hash, bytes, created_at, started_at, finished_at, expires_at, from_on, to_on,
	error_message`

const exportEventColumns = `id, ref, export_id, kind, payload_json, actor, at`

func (s *Store) InsertExport(ctx context.Context, job entity.Export) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertExport")
	defer endSpan()

	if job.Ref == "" {
		job.Ref = uuid.New()
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO exports
			(ref, client_id, status, format, schema_version, counts_json, file_hash, bytes,
			 created_at, started_at, finished_at, expires_at, from_on, to_on, error_message)
		VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, ?, NULL, NULL, NULL, ?, ?, NULL)`,
		job.Ref,
		job.ClientID,
		job.Status,
		job.Format,
		job.SchemaVersion,
		job.CreatedAt.UTC().Format(constant.TimestampLayout),
		nullDay(job.FromOn),
		nullDay(job.ToOn),
	)
	if err != nil {
		return entity.Export{}, fmt.Errorf("insert export: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.Export{}, fmt.Errorf("export id: %w", err)
	}

	job.ID = id
	job.Bytes = 0

	return job, nil
}

func (s *Store) ExportByRef(ctx context.Context, ref string) (entity.Export, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExportByRef")
	defer endSpan()

	return scanExport(s.db.QueryRowContext(ctx,
		`SELECT `+exportColumns+` FROM exports WHERE ref = ?`, ref))
}

func (s *Store) ExportByClientID(ctx context.Context, clientID string) (entity.Export, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExportByClientID")
	defer endSpan()

	return scanExport(s.db.QueryRowContext(ctx,
		`SELECT `+exportColumns+` FROM exports WHERE client_id = ?`, clientID))
}

func (s *Store) ListExports(ctx context.Context, filter entity.ExportFilter) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListExports")
	defer endSpan()

	builder := newList("exports", exportColumns)
	builder.eq("exports.status", filter.Status)
	builder.eq("exports.format", filter.Format)
	builder.before("exports.id", "exports", filter.Cursor)
	builder.orderBy("exports.id DESC")

	return pageScan(ctx, s.db, "exports", builder, clampLimit(filter.Limit), scanExportRow)
}

func (s *Store) QueuedExports(ctx context.Context, limit int) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.QueuedExports")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, ref, format, from_on, to_on FROM exports WHERE status = ? ORDER BY id LIMIT ?`,
		constant.ExportStatusQueued, clampLimit(limit))
	if err != nil {
		return nil, fmt.Errorf("select queued exports: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var queued []entity.Export

	for rows.Next() {
		var (
			job          entity.Export
			fromOn, toOn sql.NullString
		)

		if scanErr := rows.Scan(&job.ID, &job.Ref, &job.Format, &fromOn, &toOn); scanErr != nil {
			return nil, fmt.Errorf("scan queued export: %w", scanErr)
		}

		if job.FromOn, err = parseDay(fromOn); err != nil {
			return nil, fmt.Errorf("scan queued export: %w", err)
		}

		if job.ToOn, err = parseDay(toOn); err != nil {
			return nil, fmt.Errorf("scan queued export: %w", err)
		}

		job.Status = constant.ExportStatusQueued

		queued = append(queued, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate queued exports: %w", err)
	}

	return queued, nil
}

func (s *Store) ClaimExport(ctx context.Context, ref string, at time.Time) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ClaimExport")
	defer endSpan()

	return execAffected(ctx, s.db,
		`UPDATE exports SET status = ?, started_at = ? WHERE ref = ? AND status = ?`,
		constant.ExportStatusRunning,
		at.UTC().Format(constant.TimestampLayout),
		ref,
		constant.ExportStatusQueued,
	)
}

func (s *Store) FinishExport(ctx context.Context, job entity.Export) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.FinishExport")
	defer endSpan()

	if err := mustAffectOne(ctx, s.db,
		`UPDATE exports SET status = ?, file_hash = ?, bytes = ?, counts_json = ?,
			finished_at = ?, expires_at = ?
		 WHERE ref = ? AND status = ?`,
		constant.ExportStatusReady,
		job.FileHash,
		job.Bytes,
		nullString(job.CountsJSON),
		nullTime(job.FinishedAt),
		nullTime(job.ExpiresAt),
		job.Ref,
		constant.ExportStatusRunning,
	); err != nil {
		return entity.Export{}, err
	}

	return s.exportByRef(ctx, job.Ref)
}

func (s *Store) FailExport(
	ctx context.Context,
	ref, message string,
	at time.Time,
) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.FailExport")
	defer endSpan()

	if err := mustAffectOne(ctx, s.db,
		`UPDATE exports SET status = ?, error_message = ?, finished_at = ? WHERE ref = ? AND status = ?`,
		constant.ExportStatusFailed,
		message,
		at.UTC().Format(constant.TimestampLayout),
		ref,
		constant.ExportStatusRunning,
	); err != nil {
		return entity.Export{}, err
	}

	return s.exportByRef(ctx, ref)
}

func (s *Store) StaleExports(
	ctx context.Context,
	startedBefore time.Time,
	limit int,
) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.StaleExports")
	defer endSpan()

	return s.exportRefs(ctx,
		`SELECT id, ref FROM exports WHERE status = ? AND started_at < ?
		 ORDER BY started_at ASC, id ASC LIMIT ?`,
		constant.ExportStatusRunning,
		startedBefore.UTC().Format(constant.TimestampLayout),
		clampLimit(limit),
	)
}

func (s *Store) RequeueExport(ctx context.Context, ref string) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RequeueExport")
	defer endSpan()

	return execAffected(ctx, s.db,
		`UPDATE exports SET status = ?, started_at = NULL WHERE ref = ? AND status = ?`,
		constant.ExportStatusQueued, ref, constant.ExportStatusRunning)
}

func (s *Store) ExpiredExports(
	ctx context.Context,
	now time.Time,
	limit int,
) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExpiredExports")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, ref, file_hash FROM exports WHERE status = ? AND expires_at < ?
		 ORDER BY expires_at ASC, id ASC LIMIT ?`,
		constant.ExportStatusReady,
		now.UTC().Format(constant.TimestampLayout),
		clampLimit(limit),
	)
	if err != nil {
		return nil, fmt.Errorf("select expired exports: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var expired []entity.Export

	for rows.Next() {
		job := entity.Export{Status: constant.ExportStatusReady}

		if err := rows.Scan(&job.ID, &job.Ref, &job.FileHash); err != nil {
			return nil, fmt.Errorf("scan expired export: %w", err)
		}

		expired = append(expired, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate expired exports: %w", err)
	}

	return expired, nil
}

func (s *Store) ExpireExport(ctx context.Context, ref string, at time.Time) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExpireExport")
	defer endSpan()

	return execAffected(ctx, s.db,
		`UPDATE exports SET status = ?, finished_at = ? WHERE ref = ? AND status = ?`,
		constant.ExportStatusExpired,
		at.UTC().Format(constant.TimestampLayout),
		ref,
		constant.ExportStatusReady,
	)
}

func (s *Store) InsertExportEvent(
	ctx context.Context,
	event entity.ExportEvent,
) (entity.ExportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertExportEvent")
	defer endSpan()

	if event.Ref == "" {
		event.Ref = uuid.New()
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO export_events (ref, export_id, kind, payload_json, actor, at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		event.Ref,
		event.ExportID,
		event.Kind,
		nullString(event.Payload),
		event.Actor,
		event.At.UTC().Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.ExportEvent{}, fmt.Errorf("insert export event: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.ExportEvent{}, fmt.Errorf("export event id: %w", err)
	}

	event.ID = id

	return event, nil
}

func (s *Store) ListExportEvents(
	ctx context.Context,
	filter entity.ExportEventFilter,
) ([]entity.ExportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListExportEvents")
	defer endSpan()

	builder := newList("export_events", exportEventColumns)
	builder.and("export_events.export_id = ?", filter.ExportID)
	builder.before("export_events.id", "export_events", filter.Cursor)
	builder.orderBy("export_events.id DESC")

	return pageScan(ctx, s.db, "export events", builder, clampLimit(filter.Limit), scanExportEventRow)
}

func (s *Store) exportByRef(ctx context.Context, ref string) (entity.Export, error) {
	job, found, err := s.ExportByRef(ctx, ref)
	if err != nil {
		return entity.Export{}, err
	}

	if !found {
		return entity.Export{}, fmt.Errorf("%w: export %s", entity.ErrNotFound, ref)
	}

	return job, nil
}

func (s *Store) exportRefs(ctx context.Context, query string, args ...any) ([]entity.Export, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select exports: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Export

	for rows.Next() {
		var job entity.Export

		if err := rows.Scan(&job.ID, &job.Ref); err != nil {
			return nil, fmt.Errorf("scan export ref: %w", err)
		}

		out = append(out, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate exports: %w", err)
	}

	return out, nil
}

func execAffected(ctx context.Context, db *sql.DB, query string, args ...any) (bool, error) {
	res, err := db.ExecContext(ctx, query, args...)
	if err != nil {
		return false, fmt.Errorf("update export: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("export rows: %w", err)
	}

	return affected > 0, nil
}

func mustAffectOne(ctx context.Context, db *sql.DB, query string, args ...any) error {
	affected, err := execAffected(ctx, db, query, args...)
	if err != nil {
		return err
	}

	if !affected {
		return fmt.Errorf("%w: the export is not in that state any more", entity.ErrNotFound)
	}

	return nil
}

func scanExport(row *sql.Row) (entity.Export, bool, error) {
	job, err := scanExportRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Export{}, false, nil
	}

	if err != nil {
		return entity.Export{}, false, err
	}

	return job, true, nil
}

func scanExportRow(scanner interface{ Scan(dest ...any) error }) (entity.Export, error) {
	var (
		job        entity.Export
		counts     sql.NullString
		fileHash   sql.NullString
		createdRaw string
		started    sql.NullString
		finished   sql.NullString
		expires    sql.NullString
		fromOn     sql.NullString
		toOn       sql.NullString
		message    sql.NullString
	)

	err := scanner.Scan(
		&job.ID, &job.Ref, &job.ClientID, &job.Status, &job.Format, &job.SchemaVersion,
		&counts, &fileHash, &job.Bytes, &createdRaw, &started, &finished, &expires,
		&fromOn, &toOn, &message,
	)
	if err != nil {
		return entity.Export{}, err
	}

	if job.CreatedAt, err = parseTimestamp("created_at", createdRaw); err != nil {
		return entity.Export{}, err
	}

	if started.Valid {
		if job.StartedAt, err = timestampOf("started_at", started.String); err != nil {
			return entity.Export{}, err
		}
	}

	if finished.Valid {
		if job.FinishedAt, err = timestampOf("finished_at", finished.String); err != nil {
			return entity.Export{}, err
		}
	}

	if expires.Valid {
		if job.ExpiresAt, err = timestampOf("expires_at", expires.String); err != nil {
			return entity.Export{}, err
		}
	}

	if job.FromOn, err = parseDay(fromOn); err != nil {
		return entity.Export{}, err
	}

	if job.ToOn, err = parseDay(toOn); err != nil {
		return entity.Export{}, err
	}

	job.CountsJSON = counts.String
	job.FileHash = fileHash.String
	job.ErrorMessage = message.String

	return job, nil
}

func scanExportEventRow(scanner interface{ Scan(dest ...any) error }) (entity.ExportEvent, error) {
	var (
		event   entity.ExportEvent
		payload sql.NullString
		atRaw   string
	)

	err := scanner.Scan(
		&event.ID, &event.Ref, &event.ExportID, &event.Kind, &payload, &event.Actor, &atRaw,
	)
	if err != nil {
		return entity.ExportEvent{}, err
	}

	event.Payload = payload.String

	if event.At, err = parseTimestamp("at", atRaw); err != nil {
		return entity.ExportEvent{}, err
	}

	return event, nil
}
