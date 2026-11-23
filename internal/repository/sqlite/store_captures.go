package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const captureColumns = `id, kind, status, client_id, dedupe_key, batch_id, artifact_hash,
	raw_text, draft_json, extraction_error, extraction_job_ref, extraction_rail,
	resolved_entry_id, resolution_note, received_at, resolved_at`

// InsertCapture appends one queue item. The sealed payloads are opaque here: this
// adapter stores what the module hands it.
func (s *Store) InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertCapture")
	defer endSpan()

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO captures
			(kind, status, client_id, dedupe_key, batch_id, artifact_hash,
			 raw_text, draft_json, extraction_error, extraction_job_ref,
			 extraction_rail, resolved_entry_id, resolution_note, received_at, resolved_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		capture.Kind,
		capture.Status,
		nullString(capture.ClientID),
		capture.DedupeKey,
		nullString(capture.BatchID),
		nullString(capture.ArtifactHash),
		nullString(capture.RawText),
		nullString(capture.DraftJSON),
		nullString(capture.ExtractionError),
		nullString(capture.JobRef),
		nullString(capture.ExtractionRail),
		nullInt(capture.ResolvedEntryID),
		nullString(capture.ResolutionNote),
		capture.ReceivedAt.Format(constant.TimestampLayout),
		nullTime(capture.ResolvedAt),
	)
	if err != nil {
		return entity.Capture{}, fmt.Errorf("insert capture: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.Capture{}, fmt.Errorf("capture id: %w", err)
	}

	capture.ID = id

	return capture, nil
}

// CaptureByDedupeKey answers "did this exact receipt arrive twice".
func (s *Store) CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureByDedupeKey")
	defer endSpan()

	return s.scanCapture(ctx, s.db.QueryRowContext(ctx,
		`SELECT `+captureColumns+` FROM captures WHERE dedupe_key = ?`, key))
}

// CaptureByID reads one queue item.
func (s *Store) CaptureByID(ctx context.Context, id int64) (entity.Capture, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CaptureByID")
	defer endSpan()

	return s.scanCapture(ctx, s.db.QueryRowContext(ctx,
		`SELECT `+captureColumns+` FROM captures WHERE id = ?`, id))
}

// ListCaptures returns the queue: extracting first, then oldest pending, then the
// resolved tail, so a review screen can render top-down without sorting.
func (s *Store) ListCaptures(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListCaptures")
	defer endSpan()

	query := `SELECT ` + captureColumns + ` FROM captures WHERE (? = '' OR status = ?)`
	args := []any{filter.Status, filter.Status}

	if filter.Cursor > 0 {
		query += ` AND id < ?`

		args = append(args, filter.Cursor)
	}

	query += `
		ORDER BY CASE status
			WHEN 'extracting' THEN 0
			WHEN 'pending' THEN 1
			ELSE 2
		END, received_at ASC, id ASC
		LIMIT ?`

	args = append(args, clampLimit(filter.Limit))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select captures: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.Capture, 0, clampLimit(filter.Limit))

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

// UpdateCapture writes the mutable half of a queue item: status, draft, error,
// resolution. Identity columns are never rewritten.
func (s *Store) UpdateCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateCapture")
	defer endSpan()

	res, err := s.db.ExecContext(ctx, `
		UPDATE captures SET
			status = ?, draft_json = ?, extraction_error = ?, extraction_job_ref = ?,
			extraction_rail = ?, resolved_entry_id = ?, resolution_note = ?, resolved_at = ?
		WHERE id = ?`,
		capture.Status,
		nullString(capture.DraftJSON),
		nullString(capture.ExtractionError),
		nullString(capture.JobRef),
		nullString(capture.ExtractionRail),
		nullInt(capture.ResolvedEntryID),
		nullString(capture.ResolutionNote),
		nullTime(capture.ResolvedAt),
		capture.ID,
	)
	if err != nil {
		return entity.Capture{}, fmt.Errorf("update capture: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return entity.Capture{}, fmt.Errorf("capture rows: %w", err)
	}

	if affected == 0 {
		return entity.Capture{}, fmt.Errorf("%w: capture %d", entity.ErrNotFound, capture.ID)
	}

	return capture, nil
}

// scanCapture reads one row and reports a missing id instead of an error.
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

// scanCaptureRow maps the capture columns in order. Both *sql.Row and *sql.Rows
// satisfy the Scan half, so one scanner covers read-by-id and list.
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
		resolvedID  sql.NullInt64
		resolvedNt  sql.NullString
		receivedRaw string
		resolvedRaw sql.NullString
	)

	err := scanner.Scan(
		&capture.ID, &capture.Kind, &capture.Status, &clientID, &capture.DedupeKey,
		&batchID, &artifact, &rawText, &draft, &extractErr, &jobRef, &rail, &resolvedID,
		&resolvedNt, &receivedRaw, &resolvedRaw,
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
	capture.ResolutionNote = resolvedNt.String

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

// clampLimit keeps a caller-supplied page size inside the API's bounds.
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
