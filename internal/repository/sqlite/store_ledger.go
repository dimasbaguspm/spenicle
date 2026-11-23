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

// InsertEntry writes the entry and its postings in one transaction. It writes
// no balances: balances are always derived from postings.
func (s *Store) InsertEntry(ctx context.Context, e entity.Entry) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.InsertEntry")
	defer endSpan()

	// Defense in depth: the domain already validated this, and we check again
	// inside the transaction that will commit.
	if err := entity.CheckZeroSum(e.Postings); err != nil {
		return entity.Entry{}, err
	}

	createdAt := e.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	var entryID int64

	err := s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		res, execErr := tx.ExecContext(ctx, `
			INSERT INTO ledger_entries
				(occurred_on, payee_id, note, currency, source, recurring_rule_id,
				 client_id, reverses_entry_id, voided_at, created_at)
			VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)`,
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
			INSERT INTO audit_log (entity_table, entity_id, action, from_json, to_json, actor, at)
			VALUES ('ledger_entries', ?, 'create', NULL, NULL, 'user', ?)`,
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
	e.CreatedAt = createdAt

	return e, nil
}

// EntryByClientID answers a replay without rewriting anything.
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
		SELECT id, occurred_on, payee_id, note, currency, source, created_at
		FROM ledger_entries WHERE client_id = ?`, clientID).
		Scan(&e.ID, &occurred, &payeeID, &note, &e.Currency, &e.Source, &createdRaw)
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

// postingsByEntryID loads every leg of one entry in insertion order.
func (s *Store) postingsByEntryID(ctx context.Context, entryID int64) ([]entity.Posting, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.postingsByEntryID")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT account_id, amount_minor, base_amount_minor, fx_rate, fx_rate_date, fx_source
		FROM ledger_postings WHERE entry_id = ? ORDER BY id`, entryID)
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
		if err := rows.Scan(&p.AccountID, &p.AmountMinor, &p.BaseAmountMinor,
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

// insertPostings writes every leg of one entry inside the caller's transaction.
func insertPostings(ctx context.Context, tx *sql.Tx, entryID int64, postings []entity.Posting) error {
	for _, p := range postings {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO ledger_postings
				(entry_id, account_id, amount_minor, base_amount_minor,
				 fx_rate, fx_rate_date, fx_source)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			entryID, p.AccountID, p.AmountMinor, p.BaseAmountMinor,
			orDefault(p.FXRate, "1"), nullString(p.FXRateDate),
			orDefault(p.FXSource, constant.FXSourceIdentity),
		); err != nil {
			return fmt.Errorf("insert postings: %w", err)
		}
	}

	return nil
}

// EntryByID reads one entry with its postings. Missing is a fact, not an error.
func (s *Store) EntryByID(ctx context.Context, id int64) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.EntryByID")
	defer endSpan()

	entry, err := s.scanEntry(ctx, s.db.QueryRowContext(ctx, `
		SELECT id, occurred_on, payee_id, note, currency, source, client_id,
		       reverses_entry_id, voided_at, created_at
		FROM ledger_entries WHERE id = ?`, id))
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

// ListEntries returns the newest entries that match the filter. Postings come with
// them: a listing without legs cannot be rendered or audited.
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

// entryQuery renders the filter as SQL plus its arguments.
func entryQuery(filter entity.EntryFilter) (string, []any) {
	query := `
		SELECT id, occurred_on, payee_id, note, currency, source, client_id,
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

	if filter.AccountID != nil {
		query += ` AND id IN (SELECT entry_id FROM ledger_postings WHERE account_id = ?)`

		args = append(args, *filter.AccountID)
	}

	if filter.PayeeID != nil {
		query += ` AND payee_id = ?`

		args = append(args, *filter.PayeeID)
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

// VoidEntry writes the reversal and marks the original, in one transaction. The
// original stays readable; that is the whole point of not deleting.
func (s *Store) VoidEntry(
	ctx context.Context,
	id int64,
	reason string,
	at time.Time,
) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.VoidEntry")
	defer endSpan()

	original, found, err := s.EntryByID(ctx, id)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %d", entity.ErrNotFound, id)
	}

	reversal := entity.Entry{
		OccurredOn: original.OccurredOn,
		PayeeID:    original.PayeeID,
		Note:       reason,
		Currency:   original.Currency,
		Source:     constant.EntrySourceAdjustment,
		ReversesID: &id,
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
			at.Format(constant.TimestampLayout), id)
		if execErr != nil {
			return fmt.Errorf("mark voided: %w", execErr)
		}

		affected, rowsErr := res.RowsAffected()
		if rowsErr != nil {
			return fmt.Errorf("void rows: %w", rowsErr)
		}

		if affected == 0 {
			return fmt.Errorf("%w: entry %d is already voided", entity.ErrInvalidState, id)
		}

		return insertReversal(ctx, tx, id, reversal)
	})
	if err != nil {
		return entity.Entry{}, err
	}

	return s.reversalByReversesID(ctx, id)
}

// insertReversal writes the compensating entry and its negated legs.
func insertReversal(ctx context.Context, tx *sql.Tx, originalID int64, reversal entity.Entry) error {
	res, err := tx.ExecContext(ctx, `
		INSERT INTO ledger_entries
			(occurred_on, payee_id, note, currency, source, recurring_rule_id,
			 client_id, reverses_entry_id, voided_at, created_at)
		VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?)`,
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
		INSERT INTO audit_log (entity_table, entity_id, action, from_json, to_json, actor, at)
		VALUES ('ledger_entries', ?, 'void', NULL, NULL, 'user', ?)`,
		reversalID, reversal.CreatedAt.Format(constant.TimestampLayout)); err != nil {
		return fmt.Errorf("audit void: %w", err)
	}

	return nil
}

// reversalByReversesID reads back the entry that voids originalID.
func (s *Store) reversalByReversesID(ctx context.Context, originalID int64) (entity.Entry, error) {
	entry, err := s.scanEntry(ctx, s.db.QueryRowContext(ctx, `
		SELECT id, occurred_on, payee_id, note, currency, source, client_id,
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

// scanEntry maps one entry row, leaving postings to the caller.
func (s *Store) scanEntry(ctx context.Context, row *sql.Row) (entity.Entry, error) {
	_ = ctx

	return scanEntryRow(row)
}

// scanEntryRow is the single column mapping for entries; *sql.Row and *sql.Rows
// both satisfy the Scan half.
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

	err := scanner.Scan(&entry.ID, &occurredRaw, &payeeID, &note, &entry.Currency,
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
