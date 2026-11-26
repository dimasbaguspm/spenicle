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

const entryColumns = `id, ref, occurred_on, payee_id, note, currency, source, client_id,
	reverses_entry_id, voided_at, created_at`

const entryAccountSubquery = `SELECT p.entry_id FROM ledger_postings p
	JOIN accounts a ON a.id = p.account_id WHERE a.ref`

const payeeSubquery = `SELECT id FROM payees WHERE ref`

const postingColumns = 8

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
		id, insErr := insertEntryRow(ctx, tx, e, entryRef, createdAt)
		if insErr != nil {
			return insErr
		}

		entryID = id

		return appendEntryCreated(ctx, tx, e, entryID, entryRef)
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

func insertPostings(
	ctx context.Context,
	tx *sql.Tx,
	entryID int64,
	occurredOn string,
	postings []entity.Posting,
) error {
	if len(postings) == 0 {
		return nil
	}

	var statement strings.Builder

	statement.WriteString(`INSERT INTO ledger_postings
		(ref, entry_id, account_id, amount_minor, base_amount_minor,
		 fx_rate, fx_rate_date, fx_source) VALUES `)

	args := make([]any, 0, len(postings)*postingColumns)

	for index, p := range postings {
		if index > 0 {
			statement.WriteString(`, `)
		}

		statement.WriteString(`(` + placeholders(postingColumns) + `)`)

		args = append(args,
			uuid.New(), entryID, p.AccountID, p.AmountMinor, p.BaseAmountMinor,
			orDefault(p.FXRate, "1"), nullString(p.FXRateDate),
			orDefault(p.FXSource, constant.FXSourceIdentity))
	}

	if _, err := tx.ExecContext(ctx, statement.String(), args...); err != nil {
		return fmt.Errorf("insert postings: %w", err)
	}

	return updateRunningBalances(ctx, tx, entryID, occurredOn, postings)
}

func updateRunningBalances(
	ctx context.Context,
	tx *sql.Tx,
	entryID int64,
	occurredOn string,
	postings []entity.Posting,
) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.updateRunningBalances")
	defer endSpan()

	deltas := make(map[int64]int64, len(postings))
	accounts := make([]int64, 0, len(postings))

	for _, posting := range postings {
		if _, seen := deltas[posting.AccountID]; !seen {
			accounts = append(accounts, posting.AccountID)
		}

		deltas[posting.AccountID] += posting.BaseAmountMinor
	}

	for _, accountID := range accounts {
		state := tx.QueryRowContext(ctx,
			`SELECT dirty FROM balance_state WHERE account_id = ?`, accountID)

		var dirty bool

		err := state.Scan(&dirty)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("select balance state: %w", err)
		}

		if errors.Is(err, sql.ErrNoRows) || dirty {
			if err := rebuildRunningBalancesInTx(ctx, tx, accountID); err != nil {
				return err
			}

			continue
		}

		if err := shiftRunningBalances(
			ctx, tx, accountID, entryID, occurredOn, deltas[accountID],
		); err != nil {
			return err
		}
	}

	return nil
}

func shiftRunningBalances(
	ctx context.Context,
	tx *sql.Tx,
	accountID, entryID int64,
	occurredOn string,
	delta int64,
) error {
	var prior int64

	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE((
			SELECT balance_minor FROM running_balances
			WHERE account_id = ? AND
			      (occurred_on < ? OR (occurred_on = ? AND entry_id < ?))
			ORDER BY occurred_on DESC, entry_id DESC LIMIT 1
		), 0)`, accountID, occurredOn, occurredOn, entryID).Scan(&prior)
	if err != nil {
		return fmt.Errorf("prior running balance: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE running_balances SET balance_minor = balance_minor + ?
		WHERE account_id = ? AND
		      (occurred_on > ? OR (occurred_on = ? AND entry_id > ?))
	`, delta, accountID, occurredOn, occurredOn, entryID)
	if err != nil {
		return fmt.Errorf("shift running balances: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO running_balances (ref, account_id, entry_id, occurred_on, balance_minor)
		VALUES (?, ?, ?, ?, ?)`, uuid.New(), accountID, entryID, occurredOn, prior+delta)
	if err != nil {
		return fmt.Errorf("insert running balance: %w", err)
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

func (s *Store) UpdateEntryPayee(
	ctx context.Context,
	ref string,
	payeeID *int64,
) (entity.Entry, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateEntryPayee")
	defer endSpan()

	original, found, err := s.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, false, err
	}

	if !found {
		return entity.Entry{}, false, nil
	}

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		if _, execErr := tx.ExecContext(ctx,
			`UPDATE ledger_entries SET payee_id = ? WHERE id = ?`,
			nullInt(payeeID), original.ID,
		); execErr != nil {
			return fmt.Errorf("update payee: %w", execErr)
		}

		return appendAudit(ctx, tx, auditRecord{
			Kind:   constant.AuditEntityEntry,
			ID:     original.ID,
			Ref:    original.Ref,
			Action: constant.AuditActionUpdate,
			From:   entity.EntryPayee{PayeeID: original.PayeeID},
			To:     entity.EntryPayee{PayeeID: payeeID},
		})
	})
	if err != nil {
		return entity.Entry{}, false, err
	}

	updated, found, err := s.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, false, err
	}

	return updated, found, nil
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

	ids := make([]int64, 0, clampLimit(filter.Limit))

	for rows.Next() {
		entry, scanErr := scanEntryRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, entry)
		ids = append(ids, entry.ID)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("iterate entries: %w", rowsErr)
	}

	postings, err := s.postingsByEntryIDs(ctx, ids)
	if err != nil {
		return nil, err
	}

	for i := range out {
		out[i].Postings = postings[out[i].ID]
	}

	if err := s.attachBalances(ctx, filter, ids, out); err != nil {
		return nil, err
	}

	return out, nil
}

func (s *Store) attachBalances(
	ctx context.Context,
	filter entity.EntryFilter,
	ids []int64,
	entries []entity.Entry,
) error {
	if !filter.WithBalance || len(filter.AccountRefs) != 1 {
		return nil
	}

	balances, err := s.RunningBalances(ctx, filter.AccountRefs[0], ids)
	if err != nil {
		return err
	}

	for index := range entries {
		balance, found := balances[entries[index].ID]
		if !found {
			continue
		}

		entries[index].RunningBalanceMinor = &balance
	}

	return nil
}

func (s *Store) RunningBalances(
	ctx context.Context,
	accountRef string,
	entryIDs []int64,
) (map[int64]int64, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RunningBalances")
	defer endSpan()

	balances := make(map[int64]int64, len(entryIDs))

	if accountRef == "" || len(entryIDs) == 0 {
		return balances, nil
	}

	var accountID int64

	var dirty bool

	err := s.db.QueryRowContext(ctx, `
		SELECT a.id, COALESCE(b.dirty, 1) FROM accounts a
		LEFT JOIN balance_state b ON b.account_id = a.id
		WHERE a.ref = ?`, accountRef).Scan(&accountID, &dirty)
	if errors.Is(err, sql.ErrNoRows) {
		return balances, nil
	}

	if err != nil {
		return nil, fmt.Errorf("select balance state: %w", err)
	}

	if dirty {
		if rebuildErr := s.rebuildRunningBalances(ctx, accountID); rebuildErr != nil {
			return nil, rebuildErr
		}
	}

	args := []any{accountID}

	for _, id := range entryIDs {
		args = append(args, id)
	}

	//nolint:gosec // G202: placeholders() emits only "?" and commas, never caller text
	query := `
		SELECT entry_id, balance_minor FROM running_balances
		WHERE account_id = ? AND entry_id IN (` + placeholders(len(entryIDs)) + `)`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select running balances: %w", err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			entryID int64
			balance int64
		)

		if scanErr := rows.Scan(&entryID, &balance); scanErr != nil {
			return nil, fmt.Errorf("scan running balance: %w", scanErr)
		}

		balances[entryID] = balance
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate running balances: %w", err)
	}

	return balances, nil
}

func (s *Store) rebuildRunningBalances(ctx context.Context, accountID int64) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.rebuildRunningBalances")
	defer endSpan()

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		return rebuildRunningBalancesInTx(ctx, tx, accountID)
	})
}

func rebuildRunningBalancesInTx(ctx context.Context, tx *sql.Tx, accountID int64) error {
	var dirty bool

	err := tx.QueryRowContext(ctx,
		`SELECT dirty FROM balance_state WHERE account_id = ?`, accountID).Scan(&dirty)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("select balance state: %w", err)
	}

	if !errors.Is(err, sql.ErrNoRows) && !dirty {
		return nil
	}

	if _, err = tx.ExecContext(ctx,
		`DELETE FROM running_balances WHERE account_id = ?`, accountID); err != nil {
		return fmt.Errorf("clear running balances: %w", err)
	}

	if _, err = tx.ExecContext(ctx, `
		INSERT INTO running_balances (ref, account_id, entry_id, occurred_on, balance_minor)
		SELECT lower(hex(randomblob(16))), ?, running.id, running.occurred_on, running.balance_minor FROM (
			SELECT e.id AS id, e.occurred_on AS occurred_on,
			       SUM(SUM(p.base_amount_minor)) OVER (
			           ORDER BY e.occurred_on, e.id
			           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance_minor
			FROM ledger_postings p
			JOIN ledger_entries e ON e.id = p.entry_id
			JOIN accounts a ON a.id = p.account_id
			WHERE a.id = ?
			GROUP BY e.id, e.occurred_on
		) running`, accountID, accountID); err != nil {
		return fmt.Errorf("rebuild running balances: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO balance_state (ref, account_id, dirty) VALUES (?, ?, 0)
		ON CONFLICT (account_id) DO UPDATE SET dirty = 0`, uuid.New(), accountID)
	if err != nil {
		return fmt.Errorf("clear balance state: %w", err)
	}

	return nil
}

func (s *Store) postingsByEntryIDs(
	ctx context.Context,
	ids []int64,
) (map[int64][]entity.Posting, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.postingsByEntryIDs")
	defer endSpan()

	byEntry := make(map[int64][]entity.Posting, len(ids))

	if len(ids) == 0 {
		return byEntry, nil
	}

	args := make([]any, 0, len(ids))
	for _, id := range ids {
		args = append(args, id)
	}

	//nolint:gosec // G202: placeholders() emits only "?" and commas, never caller text
	query := `
		SELECT p.entry_id, p.account_id, a.ref, p.amount_minor, p.base_amount_minor,
		       p.fx_rate, p.fx_rate_date, p.fx_source
		FROM ledger_postings p
		JOIN accounts a ON a.id = p.account_id
		WHERE p.entry_id IN (` + placeholders(len(ids)) + `)
		ORDER BY p.entry_id, p.id`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select postings: %w", err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			entryID int64
			p       entity.Posting
			rateDay sql.NullString
		)

		if err := rows.Scan(&entryID, &p.AccountID, &p.AccountRef, &p.AmountMinor,
			&p.BaseAmountMinor, &p.FXRate, &rateDay, &p.FXSource); err != nil {
			return nil, fmt.Errorf("scan posting: %w", err)
		}

		p.FXRateDate = rateDay.String
		byEntry[entryID] = append(byEntry[entryID], p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate postings: %w", err)
	}

	return byEntry, nil
}

func entryQuery(filter entity.EntryFilter) (string, []any) {
	builder := newList("ledger_entries", entryColumns)

	if !filter.From.IsZero() {
		builder.gte("occurred_on", filter.From.Format(constant.DateLayout))
	}

	if !filter.To.IsZero() {
		builder.lte("occurred_on", filter.To.Format(constant.DateLayout))
	}

	builder.inSubquery("id", entryAccountSubquery, filter.AccountRefs...)
	builder.inList("source", filter.Sources)
	builder.eq("currency", filter.Currency)
	entrySearch(builder, filter.Query)
	builder.inList("ref", filter.Refs)
	builder.inSubquery("payee_id", payeeSubquery, filter.PayeeRefs...)
	entryAmountRange(builder, filter.AmountMin, filter.AmountMax)
	builder.nullFlag("voided_at", filter.Voided)
	builder.before("ledger_entries.id", "ledger_entries", filter.Cursor)
	builder.orderBy("id DESC")

	return builder.page(clampLimit(filter.Limit))
}

func entrySearch(builder *listQuery, term string) {
	if term == "" {
		return
	}

	pattern := "%" + escapeLike(term) + "%"

	builder.and(`(note LIKE ? ESCAPE '\' OR EXISTS (
		SELECT 1 FROM payees p WHERE p.id = payee_id AND p.name LIKE ? ESCAPE '\'))`,
		pattern, pattern)
}

func entryAmountRange(builder *listQuery, low, high *int64) {
	const match = `EXISTS (SELECT 1 FROM ledger_postings p
		WHERE p.entry_id = ledger_entries.id AND ABS(p.base_amount_minor) `

	switch {
	case low != nil && high != nil:
		builder.and(match+`BETWEEN ? AND ?)`, *low, *high)
	case low != nil:
		builder.and(match+`>= ?)`, *low)
	case high != nil:
		builder.and(match+`<= ?)`, *high)
	}
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

	reversal, err := reversalOf(original, reason, at)
	if err != nil {
		return entity.Entry{}, err
	}

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
	if err := entity.CheckZeroSum(reversal.Postings); err != nil {
		return err
	}

	reversalRef := uuid.New()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO ledger_entries
			(ref, occurred_on, payee_id, note, currency, source, recurring_rule_id,
			 client_id, reverses_entry_id, voided_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?)`,
		reversalRef,
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

	if err := insertPostings(ctx, tx, reversalID,
		reversal.OccurredOn.Format(constant.DateLayout), reversal.Postings); err != nil {
		return err
	}

	return appendAudit(ctx, tx, auditRecord{
		Kind:   constant.AuditEntityEntry,
		ID:     reversalID,
		Ref:    reversalRef,
		Action: constant.AuditActionVoid,
		To:     entity.EntryVoided{VoidedEntryID: originalID, ReversalEntryID: reversalID},
	})
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

func (s *Store) MatchingEntryRef(
	ctx context.Context,
	probe entity.EntryProbe,
) (string, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.MatchingEntryRef")
	defer endSpan()

	from := probe.OccurredOn.AddDate(0, 0, -probe.DayWindow)
	to := probe.OccurredOn.AddDate(0, 0, probe.DayWindow)

	var ref string

	err := s.db.QueryRowContext(ctx, `
		SELECT e.ref FROM ledger_entries e
		JOIN ledger_postings p ON p.entry_id = e.id
		JOIN accounts a ON a.id = p.account_id
		WHERE a.ref = ?
		  AND e.currency = ?
		  AND e.voided_at IS NULL
		  AND ABS(p.amount_minor) = ?
		  AND e.occurred_on >= ? AND e.occurred_on <= ?
		ORDER BY e.occurred_on ASC, e.id ASC
		LIMIT 1`,
		probe.AccountRef,
		probe.Currency,
		probe.AmountMinor,
		from.Format(constant.DateLayout),
		to.Format(constant.DateLayout),
	).Scan(&ref)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf("select matching entry: %w", err)
	}

	return ref, true, nil
}

func insertEntryRow(
	ctx context.Context,
	tx *sql.Tx,
	e entity.Entry,
	ref string,
	createdAt time.Time,
) (int64, error) {
	res, err := tx.ExecContext(ctx, `
		INSERT INTO ledger_entries
			(ref, occurred_on, payee_id, note, currency, source, recurring_rule_id,
			 client_id, reverses_entry_id, voided_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
		ref,
		e.OccurredOn.Format(constant.DateLayout),
		nullInt(e.PayeeID),
		nullString(e.Note),
		e.Currency,
		e.Source,
		nullInt(e.RecurringRuleID),
		nullString(e.ClientID),
		nullInt(e.ReversesID),
		createdAt.Format(constant.TimestampLayout),
	)
	if err != nil {
		return 0, fmt.Errorf("insert entry: %w", uniqueViolation(err))
	}

	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("entry id: %w", err)
	}

	if err := insertPostings(ctx, tx, id,
		e.OccurredOn.Format(constant.DateLayout), e.Postings); err != nil {
		return 0, err
	}

	return id, nil
}

func reversalOf(original entity.Entry, reason string, at time.Time) (entity.Entry, error) {
	if err := entity.CheckZeroSum(original.Postings); err != nil {
		return entity.Entry{}, err
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

	for index, posting := range original.Postings {
		amount, err := entity.NegateMinor(posting.AmountMinor)
		if err != nil {
			return entity.Entry{}, fmt.Errorf("%w: posting %d cannot be reversed: %w",
				entity.ErrInvalidPostings, index, err)
		}

		baseAmount, err := entity.NegateMinor(posting.BaseAmountMinor)
		if err != nil {
			return entity.Entry{}, fmt.Errorf("%w: posting %d cannot be reversed: %w",
				entity.ErrInvalidPostings, index, err)
		}

		posting.AmountMinor = amount
		posting.BaseAmountMinor = baseAmount
		reversal.Postings = append(reversal.Postings, posting)
	}

	if err := entity.CheckZeroSum(reversal.Postings); err != nil {
		return entity.Entry{}, err
	}

	return reversal, nil
}

func (s *Store) ReplaceEntry(
	ctx context.Context,
	ref string,
	replacement entity.Entry,
	reason string,
	at time.Time,
) (entity.Entry, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ReplaceEntry")
	defer endSpan()

	original, err := s.replacementTarget(ctx, ref, replacement)
	if err != nil {
		return entity.Entry{}, err
	}

	reversal, err := reversalOf(original, reason, at)
	if err != nil {
		return entity.Entry{}, err
	}

	replacement.Ref = uuid.New()
	replacement.Source = constant.EntrySourceAdjustment
	replacement.CreatedAt = at

	err = s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		return writeReplacement(ctx, tx, original, replacement, reversal, at)
	})
	if err != nil {
		return entity.Entry{}, err
	}

	return s.requiredEntry(ctx, replacement.Ref)
}

func (s *Store) replacementTarget(
	ctx context.Context,
	ref string,
	replacement entity.Entry,
) (entity.Entry, error) {
	original, found, err := s.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %s", entity.ErrNotFound, ref)
	}

	if original.VoidedAt != nil {
		return entity.Entry{}, fmt.Errorf("%w: entry %s is voided", entity.ErrInvalidState, ref)
	}

	if zeroErr := entity.CheckZeroSum(replacement.Postings); zeroErr != nil {
		return entity.Entry{}, zeroErr
	}

	return original, nil
}

func writeReplacement(
	ctx context.Context,
	tx *sql.Tx,
	original, replacement, reversal entity.Entry,
	at time.Time,
) error {
	res, err := tx.ExecContext(ctx, `
		UPDATE ledger_entries SET voided_at = ?
		WHERE id = ? AND voided_at IS NULL`,
		at.Format(constant.TimestampLayout), original.ID)
	if err != nil {
		return fmt.Errorf("mark voided: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("replace rows: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("%w: entry %s is already voided", entity.ErrInvalidState, original.Ref)
	}

	if revErr := insertReversal(ctx, tx, original.ID, reversal); revErr != nil {
		return revErr
	}

	id, err := insertEntryRow(ctx, tx, replacement, replacement.Ref, at)
	if err != nil {
		return err
	}

	return appendEntryCreated(ctx, tx, replacement, id, replacement.Ref)
}

func (s *Store) requiredEntry(ctx context.Context, ref string) (entity.Entry, error) {
	entry, found, err := s.EntryByRef(ctx, ref)
	if err != nil {
		return entity.Entry{}, err
	}

	if !found {
		return entity.Entry{}, fmt.Errorf("%w: entry %s", entity.ErrNotFound, ref)
	}

	return entry, nil
}
