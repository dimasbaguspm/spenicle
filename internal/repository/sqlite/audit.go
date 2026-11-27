package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/actor"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const auditColumns = `id, ref, entity_kind, entity_ref, action, actor_kind,
	actor_ref, from_json, to_json, at`

// auditRecord is one journal entry to append inside the transaction that makes
// the change it describes, so a rolled-back change never leaves a row behind.
// From and To are the payload structs of the entity package.
type auditRecord struct {
	Kind   string
	ID     int64
	Ref    string
	Action string
	From   any
	To     any
}

func appendAudit(ctx context.Context, tx *sql.Tx, record auditRecord) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.AppendAudit")
	defer endSpan()

	from := actor.Of(ctx)

	encodedFrom, err := encodeAuditPayload(record.From)
	if err != nil {
		return err
	}

	encodedTo, err := encodeAuditPayload(record.To)
	if err != nil {
		return err
	}

	if _, execErr := tx.ExecContext(ctx, `
		INSERT INTO audit_log (ref, entity_kind, entity_ref, action, actor_kind,
			actor_ref, from_json, to_json, at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		uuid.New(),
		record.Kind,
		nullString(record.Ref),
		record.Action,
		from.Kind,
		nullString(from.Ref),
		encodedFrom,
		encodedTo,
		time.Now().UTC().Format(constant.TimestampLayout),
	); execErr != nil {
		return fmt.Errorf("append audit: %w", execErr)
	}

	return nil
}

func auditTime(at *time.Time) string {
	if at == nil {
		return ""
	}

	return at.Format(constant.TimestampLayout)
}

// encodeAuditPayload validates the payload with the same tags the API uses, so a
// journal row is a typed fact: a malformed one is a bug that never gets stored.
func encodeAuditPayload(value any) (sql.NullString, error) {
	if value == nil {
		return sql.NullString{}, nil
	}

	if err := validating.Struct(value); err != nil {
		return sql.NullString{}, fmt.Errorf("validate audit payload: %w", err)
	}

	encoded, err := json.Marshal(value)
	if err != nil {
		return sql.NullString{}, fmt.Errorf("encode audit payload: %w", err)
	}

	return sql.NullString{String: string(encoded), Valid: true}, nil
}

func appendEntryCreated(ctx context.Context, tx *sql.Tx, e entity.Entry, id int64, ref string) error {
	return appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntityEntry,
		ID:     id,
		Ref:    ref,
		Action: constant.AuditActionCreate,
		To: entity.EntryCreated{
			OccurredOn: e.OccurredOn.Format(constant.DateLayout),
			Currency:   e.Currency,
			Source:     e.Source,
			Postings:   len(e.Postings),
		},
	})
}

func appendRecurringCreated(ctx context.Context, tx *sql.Tx, rule entity.Recurring) error {
	return appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntityRecurring,
		ID:     rule.ID,
		Ref:    rule.Ref,
		Action: constant.AuditActionCreate,
		To: entity.RecurringChanged{
			Cadence:   rule.Cadence,
			Amount:    rule.AmountMinor,
			Currency:  rule.Currency,
			State:     rule.State,
			NextDueOn: rule.NextDueOn.Format(constant.DateLayout),
		},
	})
}

func (s *Store) ListAudit(ctx context.Context, filter entity.AuditFilter) ([]entity.Audit, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListAudit")
	defer endSpan()

	limit := clampLimit(filter.Limit)

	builder := newList("audit_log", auditColumns)
	builder.eq("entity_kind", filter.EntityKind)
	builder.eq("entity_ref", filter.EntityRef)
	builder.eq("action", filter.Action)
	builder.eq("actor_kind", filter.ActorKind)
	builder.before("audit_log.id", "audit_log", filter.Cursor)

	if !filter.From.IsZero() {
		builder.gte("at", filter.From.UTC().Format(constant.TimestampLayout))
	}

	if !filter.To.IsZero() {
		builder.lte("at", filter.To.UTC().Format(constant.TimestampLayout))
	}

	builder.orderBy("audit_log.id DESC")

	query, args := builder.page(limit)

	return scanRows(ctx, s.db, "audit", query, args, scanAuditRow)
}

func scanAuditRow(scanner interface{ Scan(dest ...any) error }) (entity.Audit, error) {
	var (
		record    entity.Audit
		entityRef sql.NullString
		actorRef  sql.NullString
		fromJSON  sql.NullString
		toJSON    sql.NullString
		atRaw     string
	)

	if err := scanner.Scan(&record.ID, &record.Ref, &record.EntityKind, &entityRef,
		&record.Action, &record.ActorKind, &actorRef, &fromJSON, &toJSON, &atRaw); err != nil {
		return entity.Audit{}, err
	}

	record.EntityRef = entityRef.String
	record.ActorRef = actorRef.String
	record.FromJSON = fromJSON.String
	record.ToJSON = toJSON.String

	parsed, parseErr := time.Parse(constant.TimestampLayout, atRaw)
	if parseErr != nil {
		return entity.Audit{}, fmt.Errorf("audit at %q: %w", atRaw, parseErr)
	}

	record.At = parsed

	return record, nil
}
