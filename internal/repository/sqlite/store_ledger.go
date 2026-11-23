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

func (s *Store) InsertEntry(ctx context.Context, e entity.Entry) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertEntry")
	defer endSpan()

	if err := entity.CheckZeroSum(e.Postings); err != nil {
		return entity.Entry{}, err
	}

	createdAt := e.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	var entryID int64

	entryRef := uuid.New()

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO ledger_entries
				(ref, occurred_on, payee_id, note, currency, source, recurring_rule_id,
				 client_id, reverses_entry_id, voided_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)`,
			entryRef,
			e.OccurredOn.Format(constant.DateLayout),
			nullInt(e.PayeeID),
			nullString(e.Note),
			e.Currency,
			e.Source,
			nullString(e.ClientID),
			nullInt(e.ReversesID),
			createdAt.Format(constant.TimestampLayout),
		)
		if execErr != nil {
			return fmt.Errorf("insert entry: %w", execErr)
		}

		id, idErr := res.LastInsertId()
		if idErr != nil {
			return fmt.Errorf("entry id: %w", idErr)
		}

		entryID = id

		if postErr := insertPostings(ctx, tx, entryID, e.Postings); postErr != nil {
			return postErr
		}

		if _, auditErr := tx.ExecContext(ctx, `
			INSERT INTO audit_log (ref, entity_table, entity_id, action, from_json, to_json, actor, at)
			VALUES (?, 'ledger_entries', ?, 'create', NULL, NULL, 'user', ?)`,
			uuid.New(),
			entryID,
			createdAt.Format(constant.TimestampLayout),
		); auditErr != nil {
			return fmt.Errorf("audit: %w", auditErr)
		}

		return nil
	})
	if err != nil {
		return entity.Entry{}, err
	}

	e.ID = entryID
	e.Ref = entryRef
	e.CreatedAt = createdAt

	return e, nil
}

func (s *Store) EntryByClientID(ctx context.Context, clientID string) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EntryByClientID")
	defer endSpan()

	if clientID == "" {
		return entity.Entry{}, false, nil
	}

	var (
		e          entity.Entry
		occurred   string
		payeeID    sql.NullInt64
		note       sql.NullString
		createdRaw string
	)

	err := s.db.QueryRowContext(ctx, `
		SELECT id, ref, occurred_on, payee_id, note, currency, source, created_at
		FROM ledger_entries WHERE client_id = ?`, clientID).
		Scan(&e.ID, &e.Ref, &occurred, &payeeID, &note, &e.Currency, &e.Source, &createdRaw)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Entry{}, false, nil
	}

	if err != nil {
		return entity.Entry{}, false, fmt.Errorf("select entry: %w", err)
	}

	e.ClientID = clientID
	if e.OccurredOn, err = time.Parse(constant.DateLayout, occurred); err != nil {
		return entity.Entry{}, false, fmt.Errorf("occurred_on %q: %w", occurred, err)
	}

	if e.CreatedAt, err = time.Parse(time.RFC3339, createdRaw); err != nil {
		return entity.Entry{}, false, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	if payeeID.Valid {
		v := payeeID.Int64
		e.PayeeID = &v
	}

	e.Note = note.String

	postings, err := s.postingsByEntryID(ctx, e.ID)
	if err != nil {
		return entity.Entry{}, false, err
	}

	e.Postings = postings

	return e, true, nil
}

func (s *Store) postingsByEntryID(ctx context.Context, entryID int64) ([]entity.Posting, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.postingsByEntryID")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT p.account_id, a.ref, p.amount_minor, p.base_amount_minor,
		       p.fx_rate, p.fx_rate_date, p.fx_source
		FROM ledger_postings p
		JOIN accounts a ON a.id = p.account_id
		WHERE p.entry_id = ? ORDER BY p.id`, entryID)
	if err != nil {
		return nil, fmt.Errorf("select postings: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var postings []entity.Posting

	for rows.Next() {
		var (
			p       entity.Posting
			rateDay sql.NullString
		)
		if err := rows.Scan(&p.AccountID, &p.AccountRef, &p.AmountMinor, &p.BaseAmountMinor,
			&p.FXRate, &rateDay, &p.FXSource); err != nil {
			return nil, fmt.Errorf("scan posting: %w", err)
		}

		p.FXRateDate = rateDay.String
		postings = append(postings, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate postings: %w", err)
	}

	return postings, nil
}

func insertPostings(ctx context.Context, tx *sql.Tx, entryID int64, postings []entity.Posting) error {
	for _, p := range postings {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO ledger_postings
				(ref, entry_id, account_id, amount_minor, base_amount_minor,
				 fx_rate, fx_rate_date, fx_source)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			uuid.New(), entryID, p.AccountID, p.AmountMinor, p.BaseAmountMinor,
			orDefault(p.FXRate, "1"), nullString(p.FXRateDate),
			orDefault(p.FXSource, constant.FXSourceIdentity),
		); err != nil {
			return fmt.Errorf("insert postings: %w", err)
		}
	}

	return nil
}

func (s *Store) EntryByRef(ctx context.Context, ref string) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EntryByRef")
	defer endSpan()

	entry, err := s.scanEntry(ctx, s.db.QueryRowContext(ctx, `
		SELECT id, ref, occurred_on, payee_id, note, currency, source, client_id,
		       reverses_entry_id, voided_at, created_at
		FROM ledger_entries WHERE ref = ?`, ref))
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Entry{}, false, nil
	}

	if err != nil {
		return entity.Entry{}, false, err
	}

	if entry.Postings, err = s.postingsByEntryID(ctx, entry.ID); err != nil {
		return entity.Entry{}, false, err
	}

	return entry, true, nil
}

func (s *Store) ListEntries(
	ctx context.Context,
	filter entity.EntryFilter,
) ([]entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListEntries")
	defer endSpan()

	query, args := entryQuery(filter)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select entries: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Entry

	for rows.Next() {
		entry, scanErr := scanEntryRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		if entry.Postings, scanErr = s.postingsByEntryID(ctx, entry.ID); scanErr != nil {
			return nil, scanErr
		}

		out = append(out, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate entries: %w", err)
	}

	return out, nil
}

func entryQuery(filter entity.EntryFilter) (string, []any) {
	query := `
		SELECT id, ref, occurred_on, payee_id, note, currency, source, client_id,
		       reverses_entry_id, voided_at, created_at
		FROM ledger_entries
		WHERE 1 = 1`
	args := []any{}

	if !filter.From.IsZero() {
		query += ` AND occurred_on >= ?`

		args = append(args, filter.From.Format(constant.DateLayout))
	}

	if !filter.To.IsZero() {
		query += ` AND occurred_on <= ?`

		args = append(args, filter.To.Format(constant.DateLayout))
	}

	if filter.AccountRef != "" {
		query += ` AND id IN (SELECT p.entry_id FROM ledger_postings p
			JOIN accounts a ON a.id = p.account_id WHERE a.ref = ?)`

		args = append(args, filter.AccountRef)
	}

	if filter.Source != "" {
		query += ` AND source = ?`

		args = append(args, filter.Source)
	}

	if filter.Cursor > 0 {
		query += ` AND id < ?`

		args = append(args, filter.Cursor)
	}

	query += ` ORDER BY id DESC LIMIT ?`

	args = append(args, clampLimit(filter.Limit))

	return query, args
}

func (s *Store) VoidEntry(
	ctx context.Context,
	ref, reason string,
	at time.Time,
) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.VoidEntry")
	defer endSpan()

	original, found, err := s.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %s", entity.ErrNotFound, ref)
	}

	reversal := entity.Entry{
		OccurredOn: original.OccurredOn,
		PayeeID:    original.PayeeID,
		Note:       reason,
		Currency:   original.Currency,
		Source:     constant.EntrySourceAdjustment,
		ReversesID: &original.ID,
		CreatedAt:  at,
	}

	postings := make([]entity.Posting, 0, len(original.Postings))

	for _, posting := range original.Postings {
		posting.AmountMinor = -posting.AmountMinor
		posting.BaseAmountMinor = -posting.BaseAmountMinor
		postings = append(postings, posting)
	}

	reversal.Postings = postings

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			UPDATE ledger_entries SET voided_at = ?
			WHERE id = ? AND voided_at IS NULL`,
			at.Format(constant.TimestampLayout), original.ID)
		if execErr != nil {
			return fmt.Errorf("mark voided: %w", execErr)
		}

		affected, rowsErr := res.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("void rows: %w", rowsErr)
		}

		if affected == 0 {
			return fmt.Errorf("%w: entry %s is already voided", entity.ErrInvalidState, ref)
		}

		return insertReversal(ctx, tx, original.ID, reversal)
	})
	if err != nil {
		return entity.Entry{}, err
	}

	return s.reversalByReversesID(ctx, original.ID)
}

func insertReversal(ctx context.Context, tx *sql.Tx, originalID int64, reversal entity.Entry) error {
	res, err := tx.ExecContext(ctx, `
		INSERT INTO ledger_entries
			(ref, occurred_on, payee_id, note, currency, source, recurring_rule_id,
			 client_id, reverses_entry_id, voided_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?)`,
		uuid.New(),
		reversal.OccurredOn.Format(constant.DateLayout),
		nullInt(reversal.PayeeID),
		nullString(reversal.Note),
		reversal.Currency,
		reversal.Source,
		originalID,
		reversal.CreatedAt.Format(constant.TimestampLayout),
	)
	if err != nil {
		return fmt.Errorf("insert reversal: %w", err)
	}

	reversalID, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("reversal id: %w", err)
	}

	if err := insertPostings(ctx, tx, reversalID, reversal.Postings); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO audit_log (ref, entity_table, entity_id, action, from_json, to_json, actor, at)
		VALUES (?, 'ledger_entries', ?, 'void', NULL, NULL, 'user', ?)`,
		uuid.New(), reversalID, reversal.CreatedAt.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("audit void: %w", err)
	}

	return nil
}

func (s *Store) reversalByReversesID(ctx context.Context, originalID int64) (entity.Entry, error) {
	entry, err := s.scanEntry(ctx, s.db.QueryRowContext(ctx, `
		SELECT id, ref, occurred_on, payee_id, note, currency, source, client_id,
		       reverses_entry_id, voided_at, created_at
		FROM ledger_entries WHERE reverses_entry_id = ?`, originalID))
	if err != nil {
		return entity.Entry{}, fmt.Errorf("select reversal: %w", err)
	}

	if entry.Postings, err = s.postingsByEntryID(ctx, entry.ID); err != nil {
		return entity.Entry{}, err
	}

	return entry, nil
}

func (s *Store) scanEntry(ctx context.Context, row *sql.Row) (entity.Entry, error) {
	_ = ctx

	return scanEntryRow(row)
}

func scanEntryRow(scanner interface{ Scan(dest ...any) error }) (entity.Entry, error) {
	var (
		entry       entity.Entry
		payeeID     sql.NullInt64
		note        sql.NullString
		clientID    sql.NullString
		reversesID  sql.NullInt64
		voidedRaw   sql.NullString
		occurredRaw string
		createdRaw  string
	)

	err := scanner.Scan(&entry.ID, &entry.Ref, &occurredRaw, &payeeID, &note, &entry.Currency,
		&entry.Source, &clientID, &reversesID, &voidedRaw, &createdRaw)
	if err != nil {
		return entity.Entry{}, err
	}

	if entry.OccurredOn, err = time.Parse(constant.DateLayout, occurredRaw); err != nil {
		return entity.Entry{}, fmt.Errorf("occurred_on %q: %w", occurredRaw, err)
	}

	if entry.CreatedAt, err = time.Parse(constant.TimestampLayout, createdRaw); err != nil {
		return entity.Entry{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	if payeeID.Valid {
		id := payeeID.Int64
		entry.PayeeID = &id
	}

	if reversesID.Valid {
		id := reversesID.Int64
		entry.ReversesID = &id
	}

	if voidedRaw.Valid {
		at, parseErr := time.Parse(constant.TimestampLayout, voidedRaw.String)
		if parseErr != nil {
			return entity.Entry{}, fmt.Errorf("voided_at %q: %w", voidedRaw.String, parseErr)
		}

		entry.VoidedAt = &at
	}

	entry.Note = note.String
	entry.ClientID = clientID.String

	return entry, nil
}
