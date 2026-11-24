package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const mailMessageColumns = `id, ref, source, message_ref, thread_ref, message_id_header,
	provider_revision, received_at, observed_at, capture_id, status, skip_reason, attempts,
	last_error, last_synced_at, superseded_by`

func (s *Store) InsertMailMessage(
	ctx context.Context,
	message entity.MailMessage,
) (entity.MailMessage, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertMailMessage")
	defer endSpan()

	ref := message.Ref
	if ref == "" {
		ref = uuid.New()
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO mail_messages (ref, source, message_ref, thread_ref, message_id_header,
			provider_revision, received_at, observed_at, capture_id, status, skip_reason,
			attempts, last_error, last_synced_at, superseded_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ref,
		message.Source,
		message.MessageRef,
		nullString(message.ThreadRef),
		nullString(message.MessageIDHeader),
		nullString(message.ProviderRevision),
		message.ReceivedAt.Format(constant.TimestampLayout),
		message.ObservedAt.Format(constant.TimestampLayout),
		nullInt(message.CaptureID),
		message.Status,
		nullString(message.SkipReason),
		message.Attempts,
		nullString(message.LastError),
		nullTimestamp(message.LastSyncedAt),
		nullString(message.SupersededBy),
	)
	if err != nil {
		return entity.MailMessage{}, fmt.Errorf("insert mail message: %w", err)
	}

	saved, found, err := s.MailMessageByRef(ctx, ref)
	if err != nil {
		return entity.MailMessage{}, err
	}

	if !found {
		return entity.MailMessage{}, fmt.Errorf("%w: mail message %s", entity.ErrNotFound, ref)
	}

	return saved, nil
}

func (s *Store) MailMessageByRef(
	ctx context.Context,
	ref string,
) (entity.MailMessage, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.MailMessageByRef")
	defer endSpan()

	return s.scanMailMessage(ctx, `WHERE ref = ?`, ref)
}

func (s *Store) MailMessageBySource(
	ctx context.Context,
	source, messageRef string,
) (entity.MailMessage, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.MailMessageBySource")
	defer endSpan()

	return s.scanMailMessage(ctx,
		`WHERE source = ? AND message_ref = ?`, source, messageRef)
}

func (s *Store) UpdateMailMessage(
	ctx context.Context,
	message entity.MailMessage,
) (entity.MailMessage, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateMailMessage")
	defer endSpan()

	_, err := s.db.ExecContext(ctx, `
		UPDATE mail_messages SET
			provider_revision = ?, capture_id = ?, status = ?, skip_reason = ?, attempts = ?,
			last_error = ?, last_synced_at = ?, superseded_by = ?
		WHERE ref = ?`,
		nullString(message.ProviderRevision),
		nullInt(message.CaptureID),
		message.Status,
		nullString(message.SkipReason),
		message.Attempts,
		nullString(message.LastError),
		nullTimestamp(message.LastSyncedAt),
		nullString(message.SupersededBy),
		message.Ref,
	)
	if err != nil {
		return entity.MailMessage{}, fmt.Errorf("update mail message: %w", err)
	}

	saved, found, err := s.MailMessageByRef(ctx, message.Ref)
	if err != nil {
		return entity.MailMessage{}, err
	}

	if !found {
		return entity.MailMessage{}, fmt.Errorf("%w: mail message %s", entity.ErrNotFound,
			message.Ref)
	}

	return saved, nil
}

func (s *Store) scanMailMessage(
	ctx context.Context,
	clause string,
	args ...any,
) (entity.MailMessage, bool, error) {
	query := `SELECT ` + mailMessageColumns + ` FROM mail_messages ` + clause

	var (
		message      entity.MailMessage
		thread       sql.NullString
		messageID    sql.NullString
		revision     sql.NullString
		receivedAt   string
		observedAt   string
		captureID    sql.NullInt64
		skipReason   sql.NullString
		lastError    sql.NullString
		lastSyncedAt sql.NullString
		supersededBy sql.NullString
	)

	err := s.db.QueryRowContext(ctx, query, args...).Scan(&message.ID, &message.Ref,
		&message.Source, &message.MessageRef, &thread, &messageID, &revision, &receivedAt,
		&observedAt, &captureID, &message.Status, &skipReason, &message.Attempts, &lastError,
		&lastSyncedAt, &supersededBy)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.MailMessage{}, false, nil
	}

	if err != nil {
		return entity.MailMessage{}, false, fmt.Errorf("select mail message: %w", err)
	}

	message.ThreadRef = thread.String
	message.MessageIDHeader = messageID.String
	message.ProviderRevision = revision.String
	message.SkipReason = skipReason.String
	message.LastError = lastError.String
	message.SupersededBy = supersededBy.String

	if captureID.Valid {
		message.CaptureID = &captureID.Int64
	}

	var parseErr error

	if message.ReceivedAt, parseErr = parseTimestamp("received_at", receivedAt); parseErr != nil {
		return entity.MailMessage{}, false, parseErr
	}

	if message.ObservedAt, parseErr = parseTimestamp("observed_at", observedAt); parseErr != nil {
		return entity.MailMessage{}, false, parseErr
	}

	if lastSyncedAt.String != "" {
		if message.LastSyncedAt, parseErr = nullableTimestamp("last_synced_at",
			lastSyncedAt.String); parseErr != nil {
			return entity.MailMessage{}, false, parseErr
		}
	}

	return message, true, nil
}

func (s *Store) ListMailMessages(
	ctx context.Context,
	filter entity.MailMessageFilter,
) ([]entity.MailMessage, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListMailMessages")
	defer endSpan()

	builder := newList("mail_messages", mailMessageColumns)

	builder.eq("source", filter.Source)
	builder.eq("status", filter.Status)
	builder.before("mail_messages.id", "mail_messages", filter.Cursor)
	builder.orderBy("id DESC")

	query, args := builder.page(clampLimit(filter.Limit))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select mail messages: %w", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]entity.MailMessage, 0, clampLimit(filter.Limit))

	for rows.Next() {
		message, scanErr := scanMailMessageRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, message)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate mail messages: %w", err)
	}

	return out, nil
}

func scanMailMessageRow(rows *sql.Rows) (entity.MailMessage, error) {
	var (
		message      entity.MailMessage
		thread       sql.NullString
		messageID    sql.NullString
		revision     sql.NullString
		receivedAt   string
		observedAt   string
		captureID    sql.NullInt64
		skipReason   sql.NullString
		lastError    sql.NullString
		lastSyncedAt sql.NullString
		supersededBy sql.NullString
	)

	err := rows.Scan(&message.ID, &message.Ref, &message.Source, &message.MessageRef, &thread,
		&messageID, &revision, &receivedAt, &observedAt, &captureID, &message.Status,
		&skipReason, &message.Attempts, &lastError, &lastSyncedAt, &supersededBy)
	if err != nil {
		return entity.MailMessage{}, fmt.Errorf("scan mail message: %w", err)
	}

	message.ThreadRef = thread.String
	message.MessageIDHeader = messageID.String
	message.ProviderRevision = revision.String
	message.SkipReason = skipReason.String
	message.LastError = lastError.String
	message.SupersededBy = supersededBy.String

	if captureID.Valid {
		message.CaptureID = &captureID.Int64
	}

	var parseErr error

	if message.ReceivedAt, parseErr = parseTimestamp("received_at", receivedAt); parseErr != nil {
		return entity.MailMessage{}, parseErr
	}

	if message.ObservedAt, parseErr = parseTimestamp("observed_at", observedAt); parseErr != nil {
		return entity.MailMessage{}, parseErr
	}

	message.LastSyncedAt, _ = nullableTimestamp("last_synced_at", lastSyncedAt.String)

	return message, nil
}
