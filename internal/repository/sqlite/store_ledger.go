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
	// Defense in depth: the domain already validated this, and we check again
	// inside the transaction that will commit.
	if err := entity.CheckZeroSum(e.Postings); err != nil {
		return entity.Entry{}, err
	}

	createdAt := e.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return entity.Entry{}, fmt.Errorf("begin: %w", err)
	}

	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
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
		createdAt.Format(time.RFC3339),
	)
	if err != nil {
		return entity.Entry{}, fmt.Errorf("insert entry: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return entity.Entry{}, fmt.Errorf("entry id: %w", err)
	}

	if err := insertPostings(ctx, tx, id, e.Postings); err != nil {
		return entity.Entry{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO audit_log (entity_table, entity_id, action, from_json, to_json, actor, at)
		 VALUES ('ledger_entries', ?, 'create', NULL, NULL, 'user', ?)`,
		id,
		createdAt.Format(time.RFC3339),
	); err != nil {
		return entity.Entry{}, fmt.Errorf("audit: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return entity.Entry{}, fmt.Errorf("commit: %w", err)
	}

	e.ID = id
	e.CreatedAt = createdAt

	return e, nil
}

// EntryByClientID answers a replay without rewriting anything.
func (s *Store) EntryByClientID(ctx context.Context, clientID string) (entity.Entry, bool, error) {
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

	rows, err := s.db.QueryContext(ctx, `
		SELECT account_id, amount_minor, base_amount_minor, fx_rate, fx_rate_date, fx_source
		FROM ledger_postings WHERE entry_id = ? ORDER BY id`, e.ID)
	if err != nil {
		return entity.Entry{}, false, fmt.Errorf("select postings: %w", err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			p       entity.Posting
			rateDay sql.NullString
		)
		if err := rows.Scan(&p.AccountID, &p.AmountMinor, &p.BaseAmountMinor,
			&p.FXRate, &rateDay, &p.FXSource); err != nil {
			return entity.Entry{}, false, fmt.Errorf("scan posting: %w", err)
		}

		p.FXRateDate = rateDay.String
		e.Postings = append(e.Postings, p)
	}

	if err := rows.Err(); err != nil {
		return entity.Entry{}, false, fmt.Errorf("iterate postings: %w", err)
	}

	return e, true, nil
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
