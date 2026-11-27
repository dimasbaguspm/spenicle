package sqlite

import (
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type listQueryCase struct {
	build func() *listQuery
	args  []any
	name  string
	want  string
	limit int
}

func TestListQuery(t *testing.T) {
	t.Parallel()

	cases := []listQueryCase{
		{
			name: "empty filter",
			build: func() *listQuery {
				query := newList("accounts", "id, ref")
				query.orderBy("id")

				return query
			},
			limit: 50,
			want:  `SELECT id, ref FROM accounts WHERE 1 = 1 ORDER BY id LIMIT 51`,
			args:  nil,
		},
		{
			name: "like escapes wildcards and the escape character",
			build: func() *listQuery {
				query := newList("accounts", "id")
				query.like("name", `50%_a\b`)

				return query
			},
			limit: 50,
			want:  `SELECT id FROM accounts WHERE 1 = 1 AND name LIKE ? ESCAPE '\' LIMIT 51`,
			args:  []any{`%50\%\_a\\b%`},
		},
		{
			name: "inList binds one argument per value",
			build: func() *listQuery {
				query := newList("accounts", "id")
				query.inList("ref", []string{"aaa", "bbb"})

				return query
			},
			limit: 50,
			want:  `SELECT id FROM accounts WHERE 1 = 1 AND ref IN (?, ?) LIMIT 51`,
			args:  []any{"aaa", "bbb"},
		},
		{
			name: "before fetches one row more than the page",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.join(`LEFT JOIN accounts da ON da.ref = p.default_account_ref`)
				query.before("p.id", "payees", "abd")

				return query
			},
			limit: 50,
			want: `SELECT id FROM payees p LEFT JOIN accounts da ON da.ref = p.default_account_ref` +
				` WHERE 1 = 1 AND p.id < (SELECT id FROM payees WHERE ref = ?) LIMIT 51`,
			args: []any{"abd"},
		},

		{
			name: "after walks forward over the sort tuple",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.after("p.name, p.id", "name, id", "payees", "abd")

				return query
			},
			limit: 50,
			want:  `SELECT id FROM payees p WHERE 1 = 1 AND (p.name, p.id) > (SELECT name, id FROM payees WHERE ref = ?) LIMIT 51`,
			args:  []any{"abd"},
		},
		{
			name: "nullFlag true keeps the rows that have the column set",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.nullFlag("p.archived_at", "true")

				return query
			},
			limit: 50,
			want:  `SELECT id FROM payees p WHERE 1 = 1 AND p.archived_at IS NOT NULL LIMIT 51`,
			args:  nil,
		},
		{
			name: "nullFlag false keeps the rows that do not",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.nullFlag("p.archived_at", "false")

				return query
			},
			limit: 50,
			want:  `SELECT id FROM payees p WHERE 1 = 1 AND p.archived_at IS NULL LIMIT 51`,
			args:  nil,
		},
		{
			name: "every filter keeps its own argument",
			build: func() *listQuery {
				query := newList("ledger_entries", "id")
				query.gte("occurred_on", "2024-01-01")
				query.lte("occurred_on", "2024-01-31")
				query.inSubquery("id", `SELECT entry_ref WHERE a.ref`, "ace", "ade")
				query.eq("source", "manual")
				query.inList("ref", []string{"aaa"})
				query.parentRef("parent_ref", "aba")
				query.orderBy("id DESC")

				return query
			},
			limit: 10,
			want: `SELECT id FROM ledger_entries WHERE 1 = 1 AND occurred_on >= ? AND occurred_on <= ?` +
				` AND id IN (SELECT entry_ref WHERE a.ref IN (?, ?)) AND source = ? AND ref IN (?)` +
				` AND parent_ref = ? ORDER BY id DESC LIMIT 11`,
			args: []any{"2024-01-01", "2024-01-31", "ace", "ade", "manual", "aaa", "aba"},
		},
		{
			name: "amount range matches any posting inside the bounds",
			build: func() *listQuery {
				query := newList("ledger_entries", "id")

				lower := int64(1500)
				upper := int64(20000)
				entryAmountRange(query, &lower, &upper)

				return query
			},
			limit: 50,
			want: `SELECT id FROM ledger_entries WHERE 1 = 1 AND EXISTS (SELECT 1 FROM ledger_postings p` +
				"\n\t\t" + `WHERE p.entry_ref = ledger_entries.ref AND ABS(p.base_amount_minor) BETWEEN ? AND ?)` +
				` LIMIT 51`,
			args: []any{int64(1500), int64(20000)},
		},
		{
			name: "amount floor alone keeps every posting above it",
			build: func() *listQuery {
				query := newList("ledger_entries", "id")

				lower := int64(1500)
				entryAmountRange(query, &lower, nil)

				return query
			},
			limit: 50,
			want: `SELECT id FROM ledger_entries WHERE 1 = 1 AND EXISTS (SELECT 1 FROM ledger_postings p` +
				"\n\t\t" + `WHERE p.entry_ref = ledger_entries.ref AND ABS(p.base_amount_minor) >= ?)` +
				` LIMIT 51`,
			args: []any{int64(1500)},
		},
		{
			name: "no amount bound adds no clause",
			build: func() *listQuery {
				query := newList("ledger_entries", "id")
				entryAmountRange(query, nil, nil)

				return query
			},
			limit: 50,
			want:  `SELECT id FROM ledger_entries WHERE 1 = 1 LIMIT 51`,
			args:  nil,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			statement, args := testCase.build().page(testCase.limit)
			if statement != testCase.want {
				t.Fatalf("statement = %q, want %q", statement, testCase.want)
			}

			if !reflect.DeepEqual(args, testCase.args) {
				t.Fatalf("args = %v, want %v", args, testCase.args)
			}
		})
	}
}

func TestListQueryPrefix(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value string
		want  string
		args  []any
	}{
		{
			name:  "empty filter adds no clause",
			value: "",
			want:  `SELECT id FROM accounts WHERE 1 = 1 LIMIT 51`,
			args:  nil,
		},
		{
			name:  "ascii values become a lower bounded range",
			value: "Gro",
			want:  `SELECT id FROM accounts WHERE 1 = 1 AND lower(name) >= ? AND lower(name) < ? LIMIT 51`,
			args:  []any{"gro", "grp"},
		},
		{
			name:  "uppercase matches SQLite lower",
			value: "KOPI",
			want:  `SELECT id FROM accounts WHERE 1 = 1 AND lower(name) >= ? AND lower(name) < ? LIMIT 51`,
			args:  []any{"kopi", "kopj"},
		},
		{
			name:  "unicode bytes are not lowercased beyond SQLite",
			value: "Élan",
			want:  `SELECT id FROM accounts WHERE 1 = 1 AND lower(name) >= ? AND lower(name) < ? LIMIT 51`,
			args:  []any{"Élan", "Élao"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			query := newList("accounts", "id")
			query.prefix("name", tc.value)
			statement, args := query.page(50)

			if statement != tc.want {
				t.Fatalf("statement = %q, want %q", statement, tc.want)
			}
			if !reflect.DeepEqual(args, tc.args) {
				t.Fatalf("args = %v, want %v", args, tc.args)
			}
		})
	}
}

func TestPrefixSearchUsesExpressionIndex(t *testing.T) {
	db, err := Open(t.Context(), Config{Path: filepath.Join(t.TempDir(), "test.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	ctx := t.Context()
	if err := Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	tests := []struct {
		name  string
		build func() *listQuery
		want  string
	}{
		{
			name: "accounts",
			build: func() *listQuery {
				query := newList("accounts", "id")
				query.prefix("name", "Gro")
				query.orderBy("name, id")

				return query
			},
			want: "SEARCH accounts USING INDEX ix_accounts_name_prefix",
		},
		{
			name: "payees",
			build: func() *listQuery {
				query := newList("payees p", "p.id")
				query.prefix("p.name", "Gro")
				query.orderBy("p.name, p.id")

				return query
			},
			want: "SEARCH p USING INDEX ix_payees_name_prefix",
		},
		{
			name: "recurring",
			build: func() *listQuery {
				query := newList("recurring_rules r", "r.id")
				query.join(recurringJoins)
				query.prefixInSubquery("r.payee_ref", "payees", "ref", "name", "Gro")
				query.orderBy("r.next_due_on, r.id")

				return query
			},
			want: "SEARCH r USING INDEX ix_recurring_payee_ref",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			statement, args := tc.build().page(50)
			rows, err := db.QueryContext(ctx, "EXPLAIN QUERY PLAN "+statement, args...)
			if err != nil {
				t.Fatalf("explain: %v", err)
			}
			defer func() { _ = rows.Close() }()

			var plan strings.Builder
			for rows.Next() {
				var selectID, parent, unused int
				var detail string
				if err := rows.Scan(&selectID, &parent, &unused, &detail); err != nil {
					t.Fatalf("scan plan: %v", err)
				}
				plan.WriteString(detail)
				plan.WriteString("\n")
			}
			if err := rows.Err(); err != nil {
				t.Fatalf("iterate plan: %v", err)
			}

			if !strings.Contains(plan.String(), tc.want) {
				t.Fatalf("plan = %q, want it to contain %q", plan.String(), tc.want)
			}
		})
	}
}
