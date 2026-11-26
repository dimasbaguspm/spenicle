package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func seedUnrepresentableEntry(t *testing.T, store *Store) (string, entity.Account, entity.Account) {
	t.Helper()

	ctx := t.Context()
	asset, err := store.CreateAccount(ctx, "Cash", constant.AccountKindAsset, "IDR")
	if err != nil {
		t.Fatalf("asset account: %v", err)
	}

	expense, err := store.CreateAccount(ctx, "Coffee", constant.AccountKindExpense, "IDR")
	if err != nil {
		t.Fatalf("expense account: %v", err)
	}

	ref := uuid.New()
	at := time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC)

	result, err := store.db.ExecContext(ctx, `
		INSERT INTO ledger_entries (ref, occurred_on, currency, source, created_at)
		VALUES (?, ?, 'IDR', ?, ?)`,
		ref, at.Format(constant.DateLayout), constant.EntrySourceManual, at.Format(constant.TimestampLayout))
	if err != nil {
		t.Fatalf("seed entry: %v", err)
	}

	entryID, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("seed entry id: %v", err)
	}

	amounts := []struct {
		accountID int64
		amount    int64
	}{
		{asset.ID, math.MinInt64},
		{expense.ID, math.MaxInt64},
		{asset.ID, 1},
	}

	for _, amount := range amounts {
		_, err := store.db.ExecContext(ctx, `
			INSERT INTO ledger_postings
				(ref, entry_id, account_id, amount_minor, base_amount_minor, fx_rate, fx_source)
			VALUES (?, ?, ?, ?, ?, '1', 'identity')`,
			uuid.New(), entryID, amount.accountID, amount.amount, amount.amount)
		if err != nil {
			t.Fatalf("seed posting: %v", err)
		}
	}

	return ref, asset, expense
}

func countRows(t *testing.T, db *sql.DB, query string) int {
	t.Helper()

	var n int
	if err := db.QueryRowContext(t.Context(), query).Scan(&n); err != nil {
		t.Fatalf("count rows: %v", err)
	}

	return n
}

func assertNothingWritten(t *testing.T, db *sql.DB) {
	t.Helper()

	checks := []struct {
		name  string
		query string
		want  int
	}{
		{name: "entries", query: `SELECT COUNT(*) FROM ledger_entries`, want: 1},
		{name: "postings", query: `SELECT COUNT(*) FROM ledger_postings`, want: 3},
		{name: "voided entries", query: `SELECT COUNT(*) FROM ledger_entries WHERE voided_at IS NOT NULL`},
		{name: "void audits", query: `SELECT COUNT(*) FROM audit_log WHERE action = 'void'`},
	}

	for _, check := range checks {
		if got := countRows(t, db, check.query); got != check.want {
			t.Fatalf("%s = %d, want %d", check.name, got, check.want)
		}
	}
}

func TestUnrepresentableReversalIsNotCommitted(t *testing.T) {
	tests := []struct {
		name string
		act  func(context.Context, *Store, string, entity.Account, entity.Account) error
	}{
		{
			name: "void",
			act: func(ctx context.Context, store *Store, ref string, _, _ entity.Account) error {
				_, err := store.VoidEntry(ctx, ref, "why", time.Now().UTC())
				return err
			},
		},
		{
			name: "correct",
			act: func(ctx context.Context, store *Store, ref string, asset, expense entity.Account) error {
				_, err := store.ReplaceEntry(ctx, ref, entity.Entry{
					OccurredOn: time.Date(2026, 2, 14, 0, 0, 0, 0, time.UTC),
					Currency:   "IDR",
					Postings: []entity.Posting{
						{AccountID: asset.ID, AmountMinor: 100, BaseAmountMinor: 100},
						{AccountID: expense.ID, AmountMinor: -100, BaseAmountMinor: -100},
					},
				}, "why", time.Now().UTC())
				return err
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			db, err := Open(t.Context(), Config{Path: filepath.Join(t.TempDir(), "test.db")})
			if err != nil {
				t.Fatalf("open: %v", err)
			}
			t.Cleanup(func() { _ = db.Close() })

			err = Migrate(t.Context(), db)
			if err != nil {
				t.Fatalf("migrate: %v", err)
			}

			store := NewStore(db)
			ref, asset, expense := seedUnrepresentableEntry(t, store)

			err = test.act(t.Context(), store, ref, asset, expense)
			if !errors.Is(err, entity.ErrInvalidPostings) {
				t.Fatalf("err = %v, want invalid postings", err)
			}

			assertNothingWritten(t, db)
		})
	}
}
