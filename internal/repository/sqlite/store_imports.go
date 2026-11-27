package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const importBatchColumns = `import_batches.id, import_batches.ref, import_batches.client_id,
	import_batches.file_hash, import_batches.filename, import_batches.status,
	import_batches.rows_total, import_batches.currency, import_batches.created_at,
	import_batches.expires_at, import_batches.committed_at, import_batches.rejected_at`

const importRowColumns = `id, ref, batch_ref, row_index, occurred_on, amount_minor, currency, description,
	account_ref, category_ref, payee_ref, status, clash_kind, clash_entry_ref, edited_at,
	edited_fields, created_at, updated_at`

const importEventColumns = `id, ref, batch_ref, kind, row_index, payload_json, actor, at`

const (
	importRowChunkSize   = 200
	importRowColumnCount = 18
	importRowInsertHead  = `INSERT INTO import_rows
		(id, ref, batch_ref, row_index, occurred_on, amount_minor, currency, description, account_ref,
		 category_ref, payee_ref, status, clash_kind, clash_entry_ref, edited_at, edited_fields,
		 created_at, updated_at) VALUES `
	importRowInsertValues = `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
)

func (s *Store) InsertImportBatch(ctx context.Context, batch entity.ImportBatch) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertImportBatch")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		saved, insertErr := insertImportBatch(ctx, tx, batch)
		if insertErr != nil {
			return insertErr
		}

		batch = saved

		return nil
	})
	if err != nil {
		return entity.ImportBatch{}, err
	}

	return batch, nil
}

func (s *Store) InsertImportBatchWithEvent(
	ctx context.Context,
	batch entity.ImportBatch,
	event entity.ImportEvent,
) (entity.ImportBatch, error) {
	writeEvent := func(ctx context.Context, exec sqlExecer, saved entity.ImportBatch) error {
		event.BatchRef = saved.Ref
		_, err := insertImportEvent(ctx, exec, event)

		return err
	}

	return insertWithEvent(
		ctx,
		s,
		"Repository.Sqlite.InsertImportBatchWithEvent",
		batch,
		entity.ImportBatch{},
		insertImportBatch,
		writeEvent,
	)
}

func insertImportBatch(
	ctx context.Context,
	exec sqlExecer,
	batch entity.ImportBatch,
) (entity.ImportBatch, error) {
	if batch.Ref == "" {
		batch.Ref = uuid.New()
	}

	res, err := exec.ExecContext(ctx, `
		INSERT INTO import_batches
			(ref, client_id, file_hash, filename, status, rows_total, currency,
			 created_at, expires_at, committed_at, rejected_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
		batch.Ref,
		batch.ClientID,
		batch.FileHash,
		batch.Filename,
		batch.Status,
		batch.RowsTotal,
		batch.Currency,
		batch.CreatedAt.UTC().Format(constant.TimestampLayout),
		batch.ExpiresAt.UTC().Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.ImportBatch{}, fmt.Errorf("insert import batch: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.ImportBatch{}, fmt.Errorf("import batch id: %w", err)
	}

	batch.ID = id

	for index := range batch.Rows {
		batch.Rows[index].BatchRef = batch.Ref
	}

	if rowErr := insertImportRows(ctx, exec, batch.Rows); rowErr != nil {
		return entity.ImportBatch{}, rowErr
	}

	return batch, nil
}

func (s *Store) ImportBatchByRef(ctx context.Context, ref string) (entity.ImportBatch, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportBatchByRef")
	defer endSpan()

	return scanImportBatch(s.db.QueryRowContext(ctx,
		`SELECT `+importBatchColumns+` FROM import_batches WHERE ref = ?`, ref))
}

func (s *Store) ImportBatchByClientID(
	ctx context.Context,
	clientID string,
) (entity.ImportBatch, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportBatchByClientID")
	defer endSpan()

	return scanImportBatch(s.db.QueryRowContext(ctx,
		`SELECT `+importBatchColumns+` FROM import_batches WHERE client_id = ?`, clientID))
}

func (s *Store) ListImportBatches(
	ctx context.Context,
	filter entity.ImportFilter,
) ([]entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListImportBatches")
	defer endSpan()

	builder := newList("import_batches", importBatchColumns)
	builder.eq("import_batches.status", filter.Status)
	builder.before("import_batches.id", "import_batches", filter.Cursor)
	builder.orderBy("import_batches.id DESC")

	return pageScan(ctx, s.db, "import batches", builder, clampLimit(filter.Limit), scanImportBatchRow)
}

func (s *Store) CloseImportBatch(
	ctx context.Context,
	ref, status, expected string,
	at time.Time,
	event entity.ImportEvent,
) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CloseImportBatch")
	defer endSpan()

	column := "committed_at"
	if status == constant.ImportStatusRejected {
		column = "rejected_at"
	}

	var batch entity.ImportBatch

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		var current string
		if scanErr := tx.QueryRowContext(ctx,
			`SELECT status FROM import_batches WHERE ref = ?`, ref,
		).Scan(&current); scanErr != nil {
			if errors.Is(scanErr, sql.ErrNoRows) {
				return fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
			}

			return fmt.Errorf("import batch status: %w", scanErr)
		}

		if current != expected {
			return fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, ref, current)
		}

		if _, execErr := tx.ExecContext(ctx,
			`UPDATE import_batches SET status = ?, `+column+` = ? WHERE ref = ? AND status = ?`,
			status, at.UTC().Format(constant.TimestampLayout), ref, expected,
		); execErr != nil {
			return fmt.Errorf("close import batch: %w", execErr)
		}

		if event.Kind != "" {
			if insertErr := insertImportEventByRef(ctx, tx, event, ref); insertErr != nil {
				return insertErr
			}
		}

		loaded, found, scanErr := scanImportBatch(tx.QueryRowContext(ctx,
			`SELECT `+importBatchColumns+` FROM import_batches WHERE ref = ?`, ref))
		if scanErr != nil {
			return scanErr
		}

		if !found {
			return fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
		}

		batch = loaded

		return nil
	})
	if err != nil {
		return entity.ImportBatch{}, err
	}

	return batch, nil
}

func (s *Store) ImportRows(ctx context.Context, batchRef string) ([]entity.ImportRow, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportRows")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT `+importRowColumns+` FROM import_rows WHERE batch_ref = ? ORDER BY row_index`, batchRef)
	if err != nil {
		return nil, fmt.Errorf("select import rows: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.ImportRow, 0)

	for rows.Next() {
		row, scanErr := scanImportRowRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate import rows: %w", err)
	}

	return out, nil
}

func (s *Store) EditImportRow(
	ctx context.Context,
	row entity.ImportRow,
	expiresAt time.Time,
	events []entity.ImportEvent,
) (entity.ImportRow, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EditImportRow")
	defer endSpan()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		ref, status, err := importRowBatchState(ctx, tx, row.ID)
		if err != nil {
			return err
		}

		if status != constant.ImportStatusDraft {
			return fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, ref, status)
		}

		if err := updateImportRowDraft(ctx, tx, row); err != nil {
			return err
		}

		if err := extendImportBatchDraft(ctx, tx, row.BatchRef, expiresAt); err != nil {
			return err
		}

		for _, event := range events {
			if insertErr := insertImportEventByRef(ctx, tx, event, ref); insertErr != nil {
				return insertErr
			}
		}

		return nil
	})
	if err != nil {
		return entity.ImportRow{}, err
	}

	return row, nil
}

func importRowBatchState(ctx context.Context, tx *sql.Tx, rowID int64) (string, string, error) {
	var ref, status string

	err := tx.QueryRowContext(ctx, `
		SELECT b.ref, b.status FROM import_rows r
		JOIN import_batches b ON b.ref = r.batch_ref WHERE r.id = ?`, rowID,
	).Scan(&ref, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", fmt.Errorf("%w: import row %d", entity.ErrNotFound, rowID)
	}

	if err != nil {
		return "", "", fmt.Errorf("import row batch: %w", err)
	}

	return ref, status, nil
}

func updateImportRowDraft(ctx context.Context, tx *sql.Tx, row entity.ImportRow) error {
	res, err := tx.ExecContext(ctx, `
		UPDATE import_rows SET
			occurred_on = ?, amount_minor = ?, currency = ?, description = ?, category_ref = ?,
			payee_ref = ?, status = ?, edited_at = ?, edited_fields = ?, updated_at = ?
		WHERE id = ? AND batch_ref = ?`,
		row.OccurredOn.Format(constant.DateLayout),
		row.AmountMinor,
		row.Currency,
		row.Description,
		nullString(row.CategoryRef),
		nullString(row.PayeeRef),
		row.Status,
		nullTime(row.EditedAt),
		nullString(row.EditedFields),
		row.UpdatedAt.UTC().Format(constant.TimestampLayout),
		row.ID,
		row.BatchRef,
	)
	if err != nil {
		return fmt.Errorf("update import row: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("import row rows: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("%w: import row %d", entity.ErrNotFound, row.ID)
	}

	return nil
}

func extendImportBatchDraft(
	ctx context.Context,
	tx *sql.Tx,
	batchRef string,
	expiresAt time.Time,
) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE import_batches SET expires_at = ?
		WHERE ref = ? AND status = ?`,
		expiresAt.UTC().Format(constant.TimestampLayout), batchRef, constant.ImportStatusDraft,
	)
	if err != nil {
		return fmt.Errorf("extend import batch: %w", err)
	}

	return nil
}

func (s *Store) ExpiredImportBatches(
	ctx context.Context,
	now time.Time,
	limit int,
) ([]entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExpiredImportBatches")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT ref, file_hash FROM import_batches
		 WHERE status = ? AND expires_at < ?
		 ORDER BY expires_at ASC, id ASC
		 LIMIT ?`,
		constant.ImportStatusDraft,
		now.UTC().Format(constant.TimestampLayout),
		clampLimit(limit),
	)
	if err != nil {
		return nil, fmt.Errorf("select expired import batches: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var expired []entity.ImportBatch

	for rows.Next() {
		var batch entity.ImportBatch

		if err := rows.Scan(&batch.Ref, &batch.FileHash); err != nil {
			return nil, fmt.Errorf("scan expired import batch: %w", err)
		}

		expired = append(expired, batch)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate expired import batches: %w", err)
	}

	return expired, nil
}

func (s *Store) DropImportBatch(ctx context.Context, ref string, event entity.ImportEvent) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.DropImportBatch")
	defer endSpan()

	var dropped int

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx,
			`DELETE FROM import_rows WHERE batch_ref = ?`,
			ref)
		if execErr != nil {
			return fmt.Errorf("delete import rows: %w", execErr)
		}

		count, countErr := res.RowsAffected()
		if countErr != nil {
			return fmt.Errorf("import rows dropped: %w", countErr)
		}

		dropped = int(count)

		if insertErr := insertImportEventByRef(ctx, tx, event, ref); insertErr != nil {
			return insertErr
		}

		if _, execErr = tx.ExecContext(ctx,
			`DELETE FROM import_batches WHERE ref = ?`, ref); execErr != nil {
			return fmt.Errorf("delete import batch: %w", execErr)
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return dropped, nil
}

func (s *Store) InsertImportEvent(
	ctx context.Context,
	event entity.ImportEvent,
) (entity.ImportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertImportEvent")
	defer endSpan()

	return insertImportEvent(ctx, s.db, event)
}

func insertImportEvent(
	ctx context.Context,
	exec sqlExecer,
	event entity.ImportEvent,
) (entity.ImportEvent, error) {
	res, err := exec.ExecContext(ctx, `
		INSERT INTO import_events (ref, batch_ref, kind, row_index, payload_json, actor, at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		refOf(event),
		event.BatchRef,
		event.Kind,
		nullRowIndex(event.RowIndex),
		nullString(event.Payload),
		event.Actor,
		event.At.UTC().Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.ImportEvent{}, fmt.Errorf("insert import event: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.ImportEvent{}, fmt.Errorf("import event id: %w", err)
	}

	event.ID = id

	return event, nil
}

func (s *Store) ListImportEvents(
	ctx context.Context,
	filter entity.ImportEventFilter,
) ([]entity.ImportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListImportEvents")
	defer endSpan()

	builder := newList("import_events", importEventColumns)
	builder.and("import_events.batch_ref = ?", filter.BatchRef)
	builder.before("import_events.id", "import_events", filter.Cursor)
	builder.orderBy("import_events.id DESC")

	return pageScan(ctx, s.db, "import events", builder, clampLimit(filter.Limit), scanImportEventRow)
}

func insertImportRows(ctx context.Context, exec sqlExecer, rows []entity.ImportRow) error {
	lastIDQuery := `SELECT COALESCE(MAX(id), 0) FROM import_rows`

	var lastID int64
	if err := exec.QueryRowContext(ctx, lastIDQuery).Scan(&lastID); err != nil {
		return fmt.Errorf("import row id high water: %w", err)
	}

	nextID := lastID + 1

	for start := 0; start < len(rows); start += importRowChunkSize {
		end := min(start+importRowChunkSize, len(rows))
		chunk := rows[start:end]

		var query strings.Builder

		query.WriteString(importRowInsertHead)

		args := make([]any, 0, len(chunk)*importRowColumnCount)

		for index := range chunk {
			row := &chunk[index]
			if row.Ref == "" {
				row.Ref = uuid.New()
			}

			row.ID = nextID

			nextID++

			if index > 0 {
				query.WriteByte(',')
			}

			query.WriteString(importRowInsertValues)

			args = append(args,
				row.ID,
				row.Ref,
				row.BatchRef,
				row.RowIndex,
				row.OccurredOn.Format(constant.DateLayout),
				row.AmountMinor,
				row.Currency,
				row.Description,
				row.AccountRef,
				nullString(row.CategoryRef),
				nullString(row.PayeeRef),
				row.Status,
				nullString(row.ClashKind),
				nullString(row.ClashEntryRef),
				nullTime(row.EditedAt),
				nullString(row.EditedFields),
				row.CreatedAt.UTC().Format(constant.TimestampLayout),
				row.UpdatedAt.UTC().Format(constant.TimestampLayout),
			)
		}

		if _, err := exec.ExecContext(ctx, query.String(), args...); err != nil {
			return fmt.Errorf("insert import rows: %w", err)
		}
	}

	return nil
}

func scanImportBatch(row *sql.Row) (entity.ImportBatch, bool, error) {
	batch, err := scanImportBatchRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.ImportBatch{}, false, nil
	}

	if err != nil {
		return entity.ImportBatch{}, false, err
	}

	return batch, true, nil
}

func scanImportBatchRow(scanner interface{ Scan(dest ...any) error }) (entity.ImportBatch, error) {
	var (
		batch      entity.ImportBatch
		createdRaw string
		expiresRaw string
		committed  sql.NullString
		rejected   sql.NullString
	)

	err := scanner.Scan(
		&batch.ID, &batch.Ref, &batch.ClientID, &batch.FileHash, &batch.Filename,
		&batch.Status, &batch.RowsTotal, &batch.Currency, &createdRaw, &expiresRaw,
		&committed, &rejected,
	)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if batch.CreatedAt, err = parseTimestamp("created_at", createdRaw); err != nil {
		return entity.ImportBatch{}, err
	}

	if batch.ExpiresAt, err = parseTimestamp("expires_at", expiresRaw); err != nil {
		return entity.ImportBatch{}, err
	}

	if committed.Valid {
		batch.CommittedAt, err = timestampOf("committed_at", committed.String)
		if err != nil {
			return entity.ImportBatch{}, err
		}
	}

	if rejected.Valid {
		batch.RejectedAt, err = timestampOf("rejected_at", rejected.String)
		if err != nil {
			return entity.ImportBatch{}, err
		}
	}

	return batch, nil
}

func scanImportRowRow(scanner interface{ Scan(dest ...any) error }) (entity.ImportRow, error) {
	var (
		row          entity.ImportRow
		occurredRaw  string
		category     sql.NullString
		payee        sql.NullString
		clashKind    sql.NullString
		clashEntry   sql.NullString
		editedAt     sql.NullString
		editedFields sql.NullString
		createdRaw   string
		updatedRaw   string
	)

	err := scanner.Scan(
		&row.ID, &row.Ref, &row.BatchRef, &row.RowIndex, &occurredRaw, &row.AmountMinor,
		&row.Currency, &row.Description, &row.AccountRef, &category, &payee, &row.Status, &clashKind,
		&clashEntry, &editedAt, &editedFields, &createdRaw, &updatedRaw,
	)
	if err != nil {
		return entity.ImportRow{}, err
	}

	if editedAt.Valid {
		row.EditedAt, err = timestampOf("edited_at", editedAt.String)
		if err != nil {
			return entity.ImportRow{}, err
		}
	}

	row.EditedFields = editedFields.String

	if row.OccurredOn, err = time.Parse(constant.DateLayout, occurredRaw); err != nil {
		return entity.ImportRow{}, fmt.Errorf("occurred_on %q: %w", occurredRaw, err)
	}

	if row.CreatedAt, err = parseTimestamp("created_at", createdRaw); err != nil {
		return entity.ImportRow{}, err
	}

	if row.UpdatedAt, err = parseTimestamp("updated_at", updatedRaw); err != nil {
		return entity.ImportRow{}, err
	}

	row.CategoryRef = category.String
	row.PayeeRef = payee.String
	row.ClashKind = clashKind.String
	row.ClashEntryRef = clashEntry.String

	return row, nil
}

func parseTimestamp(field, raw string) (time.Time, error) {
	parsed, err := time.Parse(constant.TimestampLayout, raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("%s %q: %w", field, raw, err)
	}

	return parsed, nil
}

func timestampOf(field, raw string) (*time.Time, error) {
	parsed, err := parseTimestamp(field, raw)
	if err != nil {
		return nil, err
	}

	return &parsed, nil
}

func insertImportEventByRef(
	ctx context.Context,
	tx *sql.Tx,
	event entity.ImportEvent,
	batchRef string,
) error {
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO import_events (ref, batch_ref, kind, row_index, payload_json, actor, at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		refOf(event),
		batchRef,
		event.Kind,
		nullRowIndex(event.RowIndex),
		nullString(event.Payload),
		event.Actor,
		event.At.UTC().Format(constant.TimestampLayout),
	); err != nil {
		return fmt.Errorf("insert import event: %w", err)
	}

	return nil
}

func scanImportEventRow(scanner interface{ Scan(dest ...any) error }) (entity.ImportEvent, error) {
	var (
		event    entity.ImportEvent
		rowIndex sql.NullInt64
		payload  sql.NullString
		atRaw    string
	)

	err := scanner.Scan(
		&event.ID, &event.Ref, &event.BatchRef, &event.Kind, &rowIndex, &payload,
		&event.Actor, &atRaw,
	)
	if err != nil {
		return entity.ImportEvent{}, err
	}

	if rowIndex.Valid {
		index := int(rowIndex.Int64)
		event.RowIndex = &index
	}

	event.Payload = payload.String

	if event.At, err = parseTimestamp("at", atRaw); err != nil {
		return entity.ImportEvent{}, err
	}

	return event, nil
}

func refOf(event entity.ImportEvent) string {
	if event.Ref == "" {
		return uuid.New()
	}

	return event.Ref
}

func nullRowIndex(index *int) sql.NullInt64 {
	if index == nil {
		return sql.NullInt64{}
	}

	return sql.NullInt64{Int64: int64(*index), Valid: true}
}

const importUploadColumns = `id, ref, client_id, COALESCE(file_hash, ''), filename, chunk_total,
	received_chunks, received_bytes, status, created_at, updated_at, completed_at`

func (s *Store) InsertImportUpload(
	ctx context.Context,
	upload entity.ImportUpload,
) (entity.ImportUpload, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertImportUpload")
	defer endSpan()

	if upload.Ref == "" {
		upload.Ref = uuid.New()
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO import_uploads
			(ref, client_id, file_hash, filename, chunk_total, received_chunks, received_bytes,
			 status, created_at, updated_at, completed_at)
		VALUES (?, ?, NULL, ?, ?, 0, 0, ?, ?, ?, NULL)`,
		upload.Ref,
		upload.ClientID,
		upload.Filename,
		upload.ChunkTotal,
		upload.Status,
		upload.CreatedAt.UTC().Format(constant.TimestampLayout),
		upload.UpdatedAt.UTC().Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.ImportUpload{}, fmt.Errorf("insert import upload: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.ImportUpload{}, fmt.Errorf("import upload id: %w", err)
	}

	upload.ID = id
	upload.ReceivedChunks = 0
	upload.ReceivedBytes = 0

	return upload, nil
}

func (s *Store) ImportUploadByClientID(
	ctx context.Context,
	clientID string,
) (entity.ImportUpload, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportUploadByClientID")
	defer endSpan()

	return scanImportUpload(s.db.QueryRowContext(ctx,
		`SELECT `+importUploadColumns+` FROM import_uploads WHERE client_id = ?`, clientID))
}

func (s *Store) ImportUploadByRef(
	ctx context.Context,
	ref string,
) (entity.ImportUpload, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportUploadByRef")
	defer endSpan()

	return scanImportUpload(s.db.QueryRowContext(ctx,
		`SELECT `+importUploadColumns+` FROM import_uploads WHERE ref = ?`, ref))
}

func (s *Store) AppendImportChunk(
	ctx context.Context,
	ref string,
	index int,
	bytes int64,
	chunkHash string,
	at time.Time,
) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AppendImportChunk")
	defer endSpan()

	var inserted bool

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		var existing sql.NullString

		queryErr := tx.QueryRowContext(ctx, `
			SELECT chunk_sha256 FROM import_upload_chunks
			WHERE upload_ref = ? AND chunk_index = ?`, ref, index).Scan(&existing)
		if queryErr != nil && !errors.Is(queryErr, sql.ErrNoRows) {
			return fmt.Errorf("read import chunk: %w", queryErr)
		}

		if queryErr == nil {
			if existing.String != chunkHash {
				return fmt.Errorf("%w: chunk %d", entity.ErrImportChunkConflict, index)
			}

			return nil
		}

		if _, execErr := tx.ExecContext(ctx, `
			INSERT INTO import_upload_chunks
				(upload_ref, chunk_index, bytes, chunk_sha256, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			ref, index, bytes, chunkHash, at.UTC().Format(constant.TimestampLayout),
		); execErr != nil {
			return fmt.Errorf("insert import chunk: %w", execErr)
		}

		if _, updateErr := tx.ExecContext(ctx, `
			UPDATE import_uploads SET
				received_chunks = received_chunks + 1,
				received_bytes = received_bytes + ?,
				updated_at = ?
			WHERE ref = ?`,
			bytes, at.UTC().Format(constant.TimestampLayout), ref,
		); updateErr != nil {
			return fmt.Errorf("advance import upload: %w", updateErr)
		}

		inserted = true

		return nil
	})
	if err != nil {
		return false, err
	}

	return inserted, nil
}

func (s *Store) CompleteImportUpload(
	ctx context.Context,
	ref, fileHash string,
	at time.Time,
) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CompleteImportUpload")
	defer endSpan()

	res, err := s.db.ExecContext(ctx, `
		UPDATE import_uploads SET
			status = ?, file_hash = ?, completed_at = ?, updated_at = ?
		WHERE ref = ? AND status = ?`,
		constant.ImportUploadStatusComplete,
		fileHash,
		at.UTC().Format(constant.TimestampLayout),
		at.UTC().Format(constant.TimestampLayout),
		ref,
		constant.ImportUploadStatusOpen,
	)
	if err != nil {
		return false, fmt.Errorf("complete import upload: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("import upload rows: %w", err)
	}

	return affected > 0, nil
}

func (s *Store) ExpiredImportUploads(
	ctx context.Context,
	before time.Time,
	limit int,
) ([]entity.ImportUpload, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExpiredImportUploads")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT `+importUploadColumns+` FROM import_uploads
		 WHERE status = ? AND updated_at < ?
		 ORDER BY updated_at ASC, id ASC
		 LIMIT ?`,
		constant.ImportUploadStatusOpen,
		before.UTC().Format(constant.TimestampLayout),
		clampLimit(limit),
	)
	if err != nil {
		return nil, fmt.Errorf("select expired import uploads: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.ImportUpload, 0)

	for rows.Next() {
		upload, scanErr := scanImportUploadRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, upload)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate import uploads: %w", err)
	}

	return out, nil
}

func (s *Store) DropImportUpload(ctx context.Context, ref string) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.DropImportUpload")
	defer endSpan()

	var dropped int

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx,
			`DELETE FROM import_upload_chunks
			 WHERE upload_ref = ?`,
			ref)
		if execErr != nil {
			return fmt.Errorf("delete import chunks: %w", execErr)
		}

		count, countErr := res.RowsAffected()
		if countErr != nil {
			return fmt.Errorf("import chunks dropped: %w", countErr)
		}

		dropped = int(count)

		if _, execErr = tx.ExecContext(ctx,
			`DELETE FROM import_uploads WHERE ref = ?`, ref); execErr != nil {
			return fmt.Errorf("delete import upload: %w", execErr)
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return dropped, nil
}

func scanImportUpload(row *sql.Row) (entity.ImportUpload, bool, error) {
	upload, err := scanImportUploadRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.ImportUpload{}, false, nil
	}

	if err != nil {
		return entity.ImportUpload{}, false, err
	}

	return upload, true, nil
}

func scanImportUploadRow(scanner interface{ Scan(dest ...any) error }) (entity.ImportUpload, error) {
	var (
		upload      entity.ImportUpload
		createdRaw  string
		updatedRaw  string
		completedAt sql.NullString
	)

	err := scanner.Scan(
		&upload.ID, &upload.Ref, &upload.ClientID, &upload.FileHash, &upload.Filename,
		&upload.ChunkTotal, &upload.ReceivedChunks, &upload.ReceivedBytes, &upload.Status,
		&createdRaw, &updatedRaw, &completedAt,
	)
	if err != nil {
		return entity.ImportUpload{}, err
	}

	if upload.CreatedAt, err = parseTimestamp("created_at", createdRaw); err != nil {
		return entity.ImportUpload{}, err
	}

	if upload.UpdatedAt, err = parseTimestamp("updated_at", updatedRaw); err != nil {
		return entity.ImportUpload{}, err
	}

	if completedAt.Valid {
		upload.CompletedAt, err = timestampOf("completed_at", completedAt.String)
		if err != nil {
			return entity.ImportUpload{}, err
		}
	}

	return upload, nil
}

func (s *Store) BeginImportCommit(ctx context.Context, ref string) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.BeginImportCommit")
	defer endSpan()

	res, err := s.db.ExecContext(ctx,
		`UPDATE import_batches SET status = ? WHERE ref = ? AND status = ?`,
		constant.ImportStatusCommitting, ref, constant.ImportStatusDraft)
	if err != nil {
		return false, fmt.Errorf("begin import commit: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("import batch rows: %w", err)
	}

	return affected > 0, nil
}
