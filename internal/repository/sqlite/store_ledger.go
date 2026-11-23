package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// InsertEntry writes the entry and its postings in one transaction. It writes
// no balances: balances are always derived from postings.
func (s *Store) InsertEntry(ctx context.Context, e entity.Entry) (entity.Entry, error) {
	ctx, endSpan := startSpan(ctx, "InsertEntry")
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
	ctx, endSpan := startSpan(ctx, "EntryByClientID")
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
	ctx, endSpan := startSpan(ctx, "postingsByEntryID")
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
