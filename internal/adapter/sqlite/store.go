package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/domain"
)

// Store implements the driven ports against SQLite.
type Store struct {
	db *sql.DB
}

// NewStore wraps a handle.
func NewStore(db *sql.DB) *Store { return &Store{db: db} }

const dateLayout = "2006-01-02"

var _ interface {
	Code(ctx context.Context) (string, error)
} = (*Store)(nil)

// InsertEntry writes the entry and its postings in one transaction. It writes
// no balances: balances are always derived from postings.
func (s *Store) InsertEntry(ctx context.Context, e domain.Entry) (domain.Entry, error) {
	// Defense in depth: the domain already validated this, and we check again
	// inside the transaction that will commit.
	if err := domain.CheckZeroSum(e.Postings); err != nil {
		return domain.Entry{}, err
	}

	createdAt := e.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Entry{}, fmt.Errorf("begin: %w", err)
	}

	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO ledger_entries
			(occurred_on, payee_id, note, currency, source, recurring_rule_id,
			 client_id, reverses_entry_id, voided_at, created_at)
		VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)`,
		e.OccurredOn.Format(dateLayout),
		nullInt(e.PayeeID),
		nullString(e.Note),
		e.Currency,
		e.Source,
		nullString(e.ClientID),
		nullInt(e.ReversesID),
		createdAt.Format(time.RFC3339),
	)
	if err != nil {
		return domain.Entry{}, fmt.Errorf("insert entry: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return domain.Entry{}, fmt.Errorf("entry id: %w", err)
	}

	for _, p := range e.Postings {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO ledger_postings
				(entry_id, account_id, amount_minor, base_amount_minor,
				 fx_rate, fx_rate_date, fx_source)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			id, p.AccountID, p.AmountMinor, p.BaseAmountMinor,
			orDefault(p.FXRate, "1"), nullString(p.FXRateDate), orDefault(p.FXSource, domain.FXIdentity),
		); err != nil {
			return domain.Entry{}, fmt.Errorf("insert posting: %w", err)
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO audit_log (entity_table, entity_id, action, from_json, to_json, actor, at)
		 VALUES ('ledger_entries', ?, 'create', NULL, NULL, 'user', ?)`,
		id,
		createdAt.Format(time.RFC3339),
	); err != nil {
		return domain.Entry{}, fmt.Errorf("audit: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return domain.Entry{}, fmt.Errorf("commit: %w", err)
	}

	e.ID = id
	e.CreatedAt = createdAt

	return e, nil
}

// EntryByClientID answers a replay without rewriting anything.
func (s *Store) EntryByClientID(ctx context.Context, clientID string) (domain.Entry, bool, error) {
	if clientID == "" {
		return domain.Entry{}, false, nil
	}

	var (
		e          domain.Entry
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
		return domain.Entry{}, false, nil
	}

	if err != nil {
		return domain.Entry{}, false, fmt.Errorf("select entry: %w", err)
	}

	e.ClientID = clientID
	if e.OccurredOn, err = time.Parse(dateLayout, occurred); err != nil {
		return domain.Entry{}, false, fmt.Errorf("occurred_on %q: %w", occurred, err)
	}

	if e.CreatedAt, err = time.Parse(time.RFC3339, createdRaw); err != nil {
		return domain.Entry{}, false, fmt.Errorf("created_at %q: %w", createdRaw, err)
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
		return domain.Entry{}, false, fmt.Errorf("select postings: %w", err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			p       domain.Posting
			rateDay sql.NullString
		)
		if err := rows.Scan(&p.AccountID, &p.AmountMinor, &p.BaseAmountMinor,
			&p.FXRate, &rateDay, &p.FXSource); err != nil {
			return domain.Entry{}, false, fmt.Errorf("scan posting: %w", err)
		}

		p.FXRateDate = rateDay.String
		e.Postings = append(e.Postings, p)
	}

	if err := rows.Err(); err != nil {
		return domain.Entry{}, false, fmt.Errorf("iterate postings: %w", err)
	}

	return e, true, nil
}

// SchemaVersion reports the highest applied migration.
func (s *Store) SchemaVersion(ctx context.Context) (int, error) {
	var v sql.NullInt64

	err := s.db.QueryRowContext(ctx, `SELECT MAX(version) FROM schema_migrations`).Scan(&v)
	if err != nil {
		return 0, fmt.Errorf("schema version: %w", err)
	}

	return int(v.Int64), nil
}

// Ping proves the file is writable, not merely readable.
func (s *Store) Ping(ctx context.Context) error {
	var one int
	if err := s.db.QueryRowContext(ctx, `SELECT 1`).Scan(&one); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	return nil
}

// Setting reads one configuration row.
func (s *Store) Setting(ctx context.Context, key string) (string, bool, error) {
	var v string

	err := s.db.QueryRowContext(ctx, `SELECT v FROM settings WHERE k = ?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf("setting %q: %w", key, err)
	}

	return v, true, nil
}

// SetSetting upserts one configuration row.
func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO settings (k, v) VALUES (?, ?)
		ON CONFLICT (k) DO UPDATE SET v = excluded.v`, key, value)
	if err != nil {
		return fmt.Errorf("set setting %q: %w", key, err)
	}

	return nil
}

// Code returns the locked reporting currency.
func (s *Store) Code(ctx context.Context) (string, error) {
	v, ok, err := s.Setting(ctx, "base_currency")
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("base_currency is not configured")
	}

	return v, nil
}

func nullString(v string) sql.NullString {
	if v == "" {
		return sql.NullString{}
	}

	return sql.NullString{String: v, Valid: true}
}

func nullInt(v *int64) sql.NullInt64 {
	if v == nil {
		return sql.NullInt64{}
	}

	return sql.NullInt64{Int64: *v, Valid: true}
}

func orDefault(v, fallback string) string {
	if v == "" {
		return fallback
	}

	return v
}
