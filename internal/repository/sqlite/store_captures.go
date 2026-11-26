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

const captureColumns = `captures.id, captures.ref, captures.kind, captures.status,
	captures.client_id, captures.dedupe_key, captures.batch_id, captures.artifact_hash,
	p.raw_text, p.draft_json, p.extraction_error, captures.extraction_job_ref,
	captures.extraction_rail, captures.extraction_model, captures.resolved_entry_id,
	captures.resolution_note, captures.received_at, captures.resolved_at,
	(SELECT e.ref FROM ledger_entries e WHERE e.id = captures.resolved_entry_id)`

const captureJoin = `LEFT JOIN capture_payloads p ON p.capture_id = captures.id`

const (
	captureStatusRank = `CASE captures.status ` +
		`WHEN 'extracting' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END`
	captureStatusRankAliased = `CASE captures.status WHEN 'extracting' THEN 0 ` +
		`WHEN 'pending' THEN 1 ELSE 2 END`
)

func (s *Store) InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertCapture")
	defer endSpan()

	if capture.Ref == "" {
		capture.Ref = uuid.New()
	}

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO captures
				(ref, kind, status, client_id, dedupe_key, batch_id, artifact_hash,
				 extraction_job_ref, extraction_rail, extraction_model,
				 resolved_entry_id, resolution_note, received_at, resolved_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			capture.Ref,
			capture.Kind,
			capture.Status,
			nullString(capture.ClientID),
			capture.DedupeKey,
			nullString(capture.BatchID),
			nullString(capture.ArtifactHash),
			nullString(capture.JobRef),
			nullString(capture.ExtractionRail),
			nullString(capture.ExtractionModel),
			nullInt(capture.ResolvedEntryID),
			nullString(capture.ResolutionNote),
			capture.ReceivedAt.Format(constant.TimestampLayout),
			nullTime(capture.ResolvedAt),
		)
		if execErr != nil {
			return fmt.Errorf("insert capture: %w", uniqueViolation(execErr))
		}

		id, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("capture id: %w", idErr)
		}

		capture.ID = id

		if _, payloadErr := tx.ExecContext(ctx, `
			INSERT INTO capture_payloads
				(ref, capture_id, raw_text, draft_json, extraction_error)
			VALUES (?, ?, ?, ?, ?)`,
			uuid.New(), id,
			nullString(capture.RawText),
			nullString(capture.DraftJSON),
			nullString(capture.ExtractionError),
		); payloadErr != nil {
			return fmt.Errorf("insert capture payload: %w", payloadErr)
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCapture,
			ID:     capture.ID,
			Ref:    capture.Ref,
			Action: constant.AuditActionCreate,
			To:     entity.CaptureChanged{Kind: capture.Kind, Status: capture.Status},
		})
	})
	if err != nil {
		return entity.Capture{}, err
	}

	return capture, nil
}

func (s *Store) CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureByDedupeKey")
	defer endSpan()

	return s.scanCapture(ctx, s.db.QueryRowContext(ctx,
		`SELECT `+captureColumns+` FROM captures `+captureJoin+` WHERE captures.dedupe_key = ?`, key))
}

func (s *Store) CaptureByClientID(ctx context.Context, clientID string) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureByClientID")
	defer endSpan()

	if clientID == "" {
		return entity.Capture{}, false, nil
	}

	return s.scanCapture(ctx, s.db.QueryRowContext(ctx,
		`SELECT `+captureColumns+` FROM captures `+captureJoin+` WHERE captures.client_id = ?`, clientID))
}

func (s *Store) CaptureByRef(ctx context.Context, ref string) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureByRef")
	defer endSpan()

	return s.scanCapture(ctx, s.db.QueryRowContext(ctx,
		`SELECT `+captureColumns+` FROM captures `+captureJoin+` WHERE captures.ref = ?`, ref))
}

func (s *Store) ListCaptures(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListCaptures")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("captures", captureColumns)
	builder.join(captureJoin)
	builder.eq("captures.status", filter.Status)
	builder.inList("captures.ref", filter.Refs)
	builder.after(captureStatusRankAliased+`, captures.received_at, captures.id`,
		captureStatusRank+`, received_at, id`, "captures", filter.Cursor)
	builder.orderBy(captureStatusRank + `, captures.received_at ASC, captures.id ASC`)

	query, args := builder.page(limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select captures: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Capture, 0, limit+1)

	for rows.Next() {
		capture, scanErr := scanCaptureRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, capture)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate captures: %w", err)
	}

	return out, nil
}

func (s *Store) UpdateCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateCapture")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if err := updateCaptureRow(ctx, tx, capture); err != nil {
			return err
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCapture,
			ID:     capture.ID,
			Ref:    capture.Ref,
			Action: auditActionOf(capture.Status),
			To:     entity.CaptureChanged{Status: capture.Status, ResolvedEntryID: capture.ResolvedEntryID},
		})
	})
	if err != nil {
		return entity.Capture{}, err
	}

	return capture, nil
}

func (s *Store) UpdateCaptureIfUnresolved(
	ctx context.Context,
	capture entity.Capture,
) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateCaptureIfUnresolved")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		var status string
		if scanErr := tx.QueryRowContext(ctx,
			`SELECT status FROM captures WHERE id = ?`, capture.ID,
		).Scan(&status); scanErr != nil {
			if errors.Is(scanErr, sql.ErrNoRows) {
				return fmt.Errorf("%w: capture %d", entity.ErrNotFound, capture.ID)
			}

			return fmt.Errorf("capture status: %w", scanErr)
		}

		switch status {
		case constant.CaptureStatusPending, constant.CaptureStatusFailed, constant.CaptureStatusExtracting:
		default:
			return fmt.Errorf("%w: %s", entity.ErrCaptureResolved, status)
		}

		if err := updateCaptureRow(ctx, tx, capture); err != nil {
			return err
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCapture,
			ID:     capture.ID,
			Ref:    capture.Ref,
			Action: auditActionOf(capture.Status),
			To:     entity.CaptureChanged{Status: capture.Status, ResolvedEntryID: capture.ResolvedEntryID},
		})
	})
	if err != nil {
		return entity.Capture{}, err
	}

	return capture, nil
}

func (s *Store) Approve(
	ctx context.Context,
	capture entity.Capture,
	entry entity.Entry,
) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ApproveCapture")
	defer endSpan()

	if err := entity.CheckZeroSum(entry.Postings); err != nil {
		return entity.Entry{}, err
	}

	createdAt := entry.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	entryRef := uuid.New()

	var entryID int64

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		var status string
		if scanErr := tx.QueryRowContext(ctx,
			`SELECT status FROM captures WHERE id = ?`, capture.ID,
		).Scan(&status); scanErr != nil {
			return fmt.Errorf("capture status: %w", scanErr)
		}

		switch status {
		case constant.CaptureStatusPending, constant.CaptureStatusFailed, constant.CaptureStatusExtracting:
		default:
			return fmt.Errorf("%w: %s", entity.ErrCaptureResolved, status)
		}

		capture.Status = constant.CaptureStatusApproved

		id, insertErr := insertEntryRow(ctx, tx, entry, entryRef, createdAt)
		if insertErr != nil {
			return insertErr
		}

		entryID = id
		capture.ResolvedEntryID = &id

		if auditErr := appendEntryCreated(ctx, tx, entry, id, entryRef); auditErr != nil {
			return auditErr
		}

		if updateErr := updateCaptureRow(ctx, tx, capture); updateErr != nil {
			return updateErr
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityCapture,
			ID:     capture.ID,
			Ref:    capture.Ref,
			Action: constant.AuditActionApprove,
			To:     entity.CaptureChanged{Status: capture.Status, ResolvedEntryID: &id},
		})
	})
	if err != nil {
		return entity.Entry{}, err
	}

	entry.ID = entryID
	entry.Ref = entryRef
	entry.CreatedAt = createdAt

	return entry, nil
}

func updateCaptureRow(ctx context.Context, tx *sql.Tx, capture entity.Capture) error {
	res, err := tx.ExecContext(ctx, `
		UPDATE captures SET
			status = ?, extraction_job_ref = ?, extraction_rail = ?,
			extraction_model = ?, resolved_entry_id = ?, resolution_note = ?,
			resolved_at = ?
		WHERE id = ?`,
		capture.Status,
		nullString(capture.JobRef),
		nullString(capture.ExtractionRail),
		nullString(capture.ExtractionModel),
		nullInt(capture.ResolvedEntryID),
		nullString(capture.ResolutionNote),
		nullTime(capture.ResolvedAt),
		capture.ID,
	)
	if err != nil {
		return fmt.Errorf("update capture: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("capture rows: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("%w: capture %d", entity.ErrNotFound, capture.ID)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO capture_payloads
			(ref, capture_id, raw_text, draft_json, extraction_error)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(capture_id) DO UPDATE SET
			draft_json = COALESCE(excluded.draft_json, capture_payloads.draft_json),
			extraction_error = excluded.extraction_error`,
		uuid.New(), capture.ID,
		nullString(capture.RawText),
		nullString(capture.DraftJSON),
		nullString(capture.ExtractionError),
	); err != nil {
		return fmt.Errorf("update capture payload: %w", err)
	}

	return nil
}

func (s *Store) scanCapture(ctx context.Context, row *sql.Row) (entity.Capture, bool, error) {
	_ = ctx

	capture, err := scanCaptureRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Capture{}, false, nil
	}

	if err != nil {
		return entity.Capture{}, false, err
	}

	return capture, true, nil
}

func scanCaptureRow(scanner interface{ Scan(dest ...any) error }) (entity.Capture, error) {
	var (
		capture     entity.Capture
		clientID    sql.NullString
		batchID     sql.NullString
		artifact    sql.NullString
		rawText     sql.NullString
		draft       sql.NullString
		extractErr  sql.NullString
		jobRef      sql.NullString
		rail        sql.NullString
		model       sql.NullString
		resolvedID  sql.NullInt64
		resolvedRf  sql.NullString
		resolvedNt  sql.NullString
		receivedRaw string
		resolvedRaw sql.NullString
	)

	err := scanner.Scan(
		&capture.ID, &capture.Ref, &capture.Kind, &capture.Status, &clientID, &capture.DedupeKey,
		&batchID, &artifact, &rawText, &draft, &extractErr, &jobRef, &rail, &model, &resolvedID,
		&resolvedNt, &receivedRaw, &resolvedRaw, &resolvedRf,
	)
	if err != nil {
		return entity.Capture{}, err
	}

	capture.ClientID = clientID.String
	capture.BatchID = batchID.String
	capture.ArtifactHash = artifact.String
	capture.RawText = rawText.String
	capture.DraftJSON = draft.String
	capture.ExtractionError = extractErr.String
	capture.JobRef = jobRef.String
	capture.ExtractionRail = rail.String
	capture.ExtractionModel = model.String
	capture.ResolutionNote = resolvedNt.String

	capture.ResolvedEntryRef = resolvedRf.String

	if resolvedID.Valid {
		id := resolvedID.Int64
		capture.ResolvedEntryID = &id
	}

	if capture.ReceivedAt, err = time.Parse(constant.TimestampLayout, receivedRaw); err != nil {
		return entity.Capture{}, fmt.Errorf("received_at %q: %w", receivedRaw, err)
	}

	if resolvedRaw.Valid {
		at, parseErr := time.Parse(constant.TimestampLayout, resolvedRaw.String)
		if parseErr != nil {
			return entity.Capture{}, fmt.Errorf("resolved_at %q: %w", resolvedRaw.String, parseErr)
		}

		capture.ResolvedAt = &at
	}

	return capture, nil
}

func clampLimit(limit int) int {
	const (
		defaultLimit = 50
		maxLimit     = 200
	)

	switch {
	case limit <= 0:
		return defaultLimit
	case limit > maxLimit:
		return maxLimit
	default:
		return limit
	}
}
