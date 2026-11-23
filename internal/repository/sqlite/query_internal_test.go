package sqlite

import (
	"reflect"
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
			name: "inRefs binds one argument per ref",
			build: func() *listQuery {
				query := newList("accounts", "id")
				query.inRefs("ref", []string{"aaa", "bbb"})

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
				query.join(`LEFT JOIN accounts da ON da.id = p.default_account_id`)
				query.before("p.id", "payees", "abd")

				return query
			},
			limit: 50,
			want: `SELECT id FROM payees p LEFT JOIN accounts da ON da.id = p.default_account_id` +
				` WHERE 1 = 1 AND p.id < (SELECT id FROM payees WHERE ref = ?) LIMIT 51`,
			args: []any{"abd"},
		},
		{
			name: "archived true",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.archived("p.archived_at", "true")

				return query
			},
			limit: 50,
			want:  `SELECT id FROM payees p WHERE 1 = 1 AND p.archived_at IS NOT NULL LIMIT 51`,
			args:  nil,
		},
		{
			name: "archived false",
			build: func() *listQuery {
				query := newList("payees p", "id")
				query.archived("p.archived_at", "false")

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
				query.inSubquery("id", `SELECT entry_id WHERE a.ref = ?`, "ace")
				query.eq("source", "manual")
				query.inRefs("ref", []string{"aaa"})
				query.parentRef("parent_id", "accounts", "aba")
				query.orderBy("id DESC")

				return query
			},
			limit: 10,
			want: `SELECT id FROM ledger_entries WHERE 1 = 1 AND occurred_on >= ? AND occurred_on <= ?` +
				` AND id IN (SELECT entry_id WHERE a.ref = ?) AND source = ? AND ref IN (?)` +
				` AND parent_id = (SELECT id FROM accounts WHERE ref = ?) ORDER BY id DESC LIMIT 11`,
			args: []any{"2024-01-01", "2024-01-31", "ace", "manual", "aaa", "aba"},
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
