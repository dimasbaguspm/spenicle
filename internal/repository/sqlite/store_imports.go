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

const importBatchColumns = `import_batches.id, import_batches.ref, import_batches.client_id,
	import_batches.file_hash, import_batches.filename, import_batches.status,
	import_batches.rows_total, import_batches.currency, import_batches.created_at,
	import_batches.expires_at, import_batches.committed_at, import_batches.rejected_at`

const importRowColumns = `id, ref, batch_id, row_index, occurred_on, amount_minor, description,
	account_ref, category_ref, payee_ref, status, clash_kind, clash_entry_ref, created_at, updated_at`

func (s *Store) InsertImportBatch(ctx context.Context, batch entity.ImportBatch) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertImportBatch")
	defer endSpan()

	if batch.Ref == "" {
		batch.Ref = uuid.New()
	}

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
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
		if execErr != nil {
			return fmt.Errorf("insert import batch: %w", execErr)
		}

		id, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("import batch id: %w", idErr)
		}

		batch.ID = id

		for index := range batch.Rows {
			batch.Rows[index].BatchID = id

			if rowErr := insertImportRow(ctx, tx, &batch.Rows[index]); rowErr != nil {
				return rowErr
			}
		}

		return nil
	})
	if err != nil {
		return entity.ImportBatch{}, err
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

	limit := clampLimit(filter.Limit)

	builder := newList("import_batches", importBatchColumns)
	builder.eq("import_batches.status", filter.Status)
	builder.before("import_batches.id", "import_batches", filter.Cursor)
	builder.orderBy("import_batches.id DESC")

	query, args := builder.page(limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select import batches: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.ImportBatch, 0, limit+1)

	for rows.Next() {
		batch, scanErr := scanImportBatchRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, batch)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate import batches: %w", err)
	}

	return out, nil
}

func (s *Store) CloseImportBatch(
	ctx context.Context,
	ref, status string,
	at time.Time,
) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CloseImportBatch")
	defer endSpan()

	column := "committed_at"
	if status == constant.ImportStatusRejected {
		column = "rejected_at"
	}

	res, err := s.db.ExecContext(ctx,
		`UPDATE import_batches SET status = ?, `+column+` = ? WHERE ref = ?`,
		status, at.UTC().Format(constant.TimestampLayout), ref)
	if err != nil {
		return entity.ImportBatch{}, fmt.Errorf("close import batch: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return entity.ImportBatch{}, fmt.Errorf("import batch rows: %w", err)
	}

	if affected == 0 {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	batch, found, err := s.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	return batch, nil
}

func (s *Store) ExtendImportBatch(ctx context.Context, ref string, expiresAt time.Time) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ExtendImportBatch")
	defer endSpan()

	if _, err := s.db.ExecContext(ctx,
		`UPDATE import_batches SET expires_at = ? WHERE ref = ? AND status = ?`,
		expiresAt.UTC().Format(constant.TimestampLayout), ref, constant.ImportStatusDraft); err != nil {
		return fmt.Errorf("extend import batch: %w", err)
	}

	return nil
}

func (s *Store) ImportRows(ctx context.Context, batchID int64) ([]entity.ImportRow, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ImportRows")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT `+importRowColumns+` FROM import_rows WHERE batch_id = ? ORDER BY row_index`, batchID)
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

func (s *Store) UpdateImportRow(
	ctx context.Context,
	row entity.ImportRow,
) (entity.ImportRow, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateImportRow")
	defer endSpan()

	res, err := s.db.ExecContext(ctx, `
		UPDATE import_rows SET
			occurred_on = ?, amount_minor = ?, description = ?, category_ref = ?,
			payee_ref = ?, status = ?, updated_at = ?
		WHERE id = ?`,
		row.OccurredOn.Format(constant.DateLayout),
		row.AmountMinor,
		row.Description,
		nullString(row.CategoryRef),
		nullString(row.PayeeRef),
		row.Status,
		row.UpdatedAt.UTC().Format(constant.TimestampLayout),
		row.ID,
	)
	if err != nil {
		return entity.ImportRow{}, fmt.Errorf("update import row: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return entity.ImportRow{}, fmt.Errorf("import row rows: %w", err)
	}

	if affected == 0 {
		return entity.ImportRow{}, fmt.Errorf("%w: import row %d", entity.ErrNotFound, row.ID)
	}

	return row, nil
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

func (s *Store) DropImportBatch(ctx context.Context, ref string) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.DropImportBatch")
	defer endSpan()

	var dropped int

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx,
			`DELETE FROM import_rows WHERE batch_id = (SELECT id FROM import_batches WHERE ref = ?)`,
			ref)
		if execErr != nil {
			return fmt.Errorf("delete import rows: %w", execErr)
		}

		count, countErr := res.RowsAffected()
		if countErr != nil {
			return fmt.Errorf("import rows dropped: %w", countErr)
		}

		dropped = int(count)

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

func insertImportRow(ctx context.Context, tx *sql.Tx, row *entity.ImportRow) error {
	if row.Ref == "" {
		row.Ref = uuid.New()
	}

	res, err := tx.ExecContext(ctx, `
		INSERT INTO import_rows
			(ref, batch_id, row_index, occurred_on, amount_minor, description, account_ref,
			 category_ref, payee_ref, status, clash_kind, clash_entry_ref, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.Ref,
		row.BatchID,
		row.RowIndex,
		row.OccurredOn.Format(constant.DateLayout),
		row.AmountMinor,
		row.Description,
		row.AccountRef,
		nullString(row.CategoryRef),
		nullString(row.PayeeRef),
		row.Status,
		nullString(row.ClashKind),
		nullString(row.ClashEntryRef),
		row.CreatedAt.UTC().Format(constant.TimestampLayout),
		row.UpdatedAt.UTC().Format(constant.TimestampLayout),
	)
	if err != nil {
		return fmt.Errorf("insert import row: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("import row id: %w", err)
	}

	row.ID = id

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
		row         entity.ImportRow
		occurredRaw string
		category    sql.NullString
		payee       sql.NullString
		clashKind   sql.NullString
		clashEntry  sql.NullString
		createdRaw  string
		updatedRaw  string
	)

	err := scanner.Scan(
		&row.ID, &row.Ref, &row.BatchID, &row.RowIndex, &occurredRaw, &row.AmountMinor,
		&row.Description, &row.AccountRef, &category, &payee, &row.Status, &clashKind,
		&clashEntry, &createdRaw, &updatedRaw,
	)
	if err != nil {
		return entity.ImportRow{}, err
	}

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
