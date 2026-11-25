package sqlite_test

import (
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/list"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type paginationCase struct {
	name string
	seed func(*testing.T, *sqlite.Store) []string
	page func(*sqlite.Store, string) ([]string, string, error)
}

func TestListCursorsFollowSortOrder(t *testing.T) {
	tests := []paginationCase{
		{
			name: "accounts by kind name and id",
			seed: func(t *testing.T, store *sqlite.Store) []string {
				t.Helper()

				refs := make(map[string]string, 3)
				for _, name := range []string{"Zebra", "Alpha", "Beta"} {
					account, err := store.CreateAccount(t.Context(), name, "asset", "IDR")
					if err != nil {
						t.Fatalf("create account %s: %v", name, err)
					}
					refs[name] = account.Ref
				}

				return []string{refs["Alpha"], refs["Beta"], refs["Zebra"]}
			},
			page: func(store *sqlite.Store, cursor string) ([]string, string, error) {
				rows, err := store.ListAccounts(t.Context(), entity.AccountFilter{
					Kind: "asset", Cursor: cursor, Limit: 1,
				})
				if err != nil {
					return nil, "", err
				}
				page, meta := list.Paginate(rows, 1, func(item entity.Account) string { return item.Ref })

				return accountRefs(page), meta.NextCursor, nil
			},
		},
		{
			name: "payees by name and id",
			seed: func(t *testing.T, store *sqlite.Store) []string {
				t.Helper()

				asset, expense := baseline(t, store)
				refs := make(map[string]string, 3)
				for _, name := range []string{"Zebra", "Alpha", "Beta"} {
					payee, err := store.CreatePayee(t.Context(), entity.Payee{
						Name: name, DefaultAccountRef: asset.Ref, DefaultCategoryRef: expense.Ref,
					})
					if err != nil {
						t.Fatalf("create payee %s: %v", name, err)
					}
					refs[name] = payee.Ref
				}

				return []string{refs["Alpha"], refs["Beta"], refs["Zebra"]}
			},
			page: func(store *sqlite.Store, cursor string) ([]string, string, error) {
				rows, err := store.ListPayees(t.Context(), entity.PayeeFilter{Cursor: cursor, Limit: 1})
				if err != nil {
					return nil, "", err
				}
				page, meta := list.Paginate(rows, 1, func(item entity.Payee) string { return item.Ref })

				return payeeRefs(page), meta.NextCursor, nil
			},
		},
		{
			name: "recurring by next due date and id",
			seed: func(t *testing.T, store *sqlite.Store) []string {
				t.Helper()

				asset, expense := baseline(t, store)
				payee, err := store.CreatePayee(t.Context(), entity.Payee{
					Name: "Rent", DefaultAccountRef: asset.Ref, DefaultCategoryRef: expense.Ref,
				})
				if err != nil {
					t.Fatalf("create payee: %v", err)
				}

				refs := make(map[int]string, 3)
				for _, dayNumber := range []int{10, 1, 5} {
					rule, createErr := store.CreateRecurring(t.Context(), entity.Recurring{
						PayeeRef: payee.Ref, AccountRef: asset.Ref, CategoryRef: expense.Ref,
						AmountMinor: 10_000, Currency: "IDR", Cadence: constant.RecurringCadenceMonthly,
						IntervalN: 1, BusinessDayShift: "none", State: constant.RecurringStateActive,
						NextDueOn: time.Date(2026, 3, dayNumber, 0, 0, 0, 0, time.UTC),
					})
					if createErr != nil {
						t.Fatalf("create recurring %d: %v", dayNumber, createErr)
					}
					refs[dayNumber] = rule.Ref
				}

				return []string{refs[1], refs[5], refs[10]}
			},
			page: func(store *sqlite.Store, cursor string) ([]string, string, error) {
				rows, err := store.ListRecurring(t.Context(), entity.RecurringFilter{Cursor: cursor, Limit: 1})
				if err != nil {
					return nil, "", err
				}
				page, meta := list.Paginate(rows, 1, func(item entity.Recurring) string { return item.Ref })

				return recurringRefs(page), meta.NextCursor, nil
			},
		},
		{
			name: "captures by status received date and id",
			seed: func(t *testing.T, store *sqlite.Store) []string {
				t.Helper()

				refs := make(map[string]string, 3)
				for _, item := range []struct {
					status    string
					received  time.Time
					dedupeKey string
				}{
					{constant.CaptureStatusPending, paginationDay(3), "pending-later"},
					{constant.CaptureStatusExtracting, paginationDay(2), "extracting"},
					{constant.CaptureStatusPending, paginationDay(1), "pending-earlier"},
				} {
					capture, err := store.InsertCapture(t.Context(), entity.Capture{
						Kind: constant.CaptureKindManual, Status: item.status,
						DedupeKey: item.dedupeKey, RawText: item.dedupeKey,
						ReceivedAt: item.received,
					})
					if err != nil {
						t.Fatalf("insert capture %s: %v", item.dedupeKey, err)
					}
					refs[item.dedupeKey] = capture.Ref
				}

				return []string{refs["extracting"], refs["pending-earlier"], refs["pending-later"]}
			},
			page: func(store *sqlite.Store, cursor string) ([]string, string, error) {
				rows, err := store.ListCaptures(t.Context(), entity.CaptureFilter{Cursor: cursor, Limit: 1})
				if err != nil {
					return nil, "", err
				}
				page, meta := list.Paginate(rows, 1, func(item entity.Capture) string { return item.Ref })

				return captureRefs(page), meta.NextCursor, nil
			},
		},
		{
			name: "categorization rules by id",
			seed: func(t *testing.T, store *sqlite.Store) []string {
				t.Helper()

				account, _ := baseline(t, store)
				out := make([]string, 0, 3)
				for _, pattern := range []string{"alpha", "bravo", "charlie"} {
					rule, err := store.CreateRule(t.Context(), entity.CategorizationRule{
						Pattern: pattern, Field: constant.RuleFieldPayee,
						MatchKind: constant.RuleMatchExact, AccountRef: account.Ref,
					})
					if err != nil {
						t.Fatalf("create rule %s: %v", pattern, err)
					}
					out = append(out, rule.Ref)
				}

				return out
			},
			page: func(store *sqlite.Store, cursor string) ([]string, string, error) {
				rows, err := store.ListRules(t.Context(), entity.CategorizationFilter{Cursor: cursor, Limit: 1})
				if err != nil {
					return nil, "", err
				}
				page, meta := list.Paginate(rows, 1, func(item entity.CategorizationRule) string { return item.Ref })

				return ruleRefs(page), meta.NextCursor, nil
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newStore(t)
			want := tc.seed(t, store)

			cursor := ""
			got := make([]string, 0, len(want))
			for range 10 {
				refs, next, err := tc.page(store, cursor)
				if err != nil {
					t.Fatalf("page: %v", err)
				}
				got = append(got, refs...)
				if next == "" {
					break
				}
				cursor = next
			}

			if !reflect.DeepEqual(got, want) {
				t.Fatalf("paged refs = [%s], want [%s]", strings.Join(got, " "), strings.Join(want, " "))
			}
		})
	}
}

func paginationDay(day int) time.Time {
	return time.Date(2026, 1, day, 12, 0, 0, 0, time.UTC)
}

func accountRefs(items []entity.Account) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, item.Ref)
	}

	return out
}

func payeeRefs(items []entity.Payee) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, item.Ref)
	}

	return out
}

func recurringRefs(items []entity.Recurring) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, item.Ref)
	}

	return out
}

func captureRefs(items []entity.Capture) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, item.Ref)
	}

	return out
}

func ruleRefs(items []entity.CategorizationRule) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, item.Ref)
	}

	return out
}
