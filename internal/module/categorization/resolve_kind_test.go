package categorization_test

import (
	"path/filepath"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type resolveFixture struct {
	service     *categorization.Service
	expense     entity.Account
	income      entity.Account
	expenseRule entity.CategorizationRule
	incomeRule  entity.CategorizationRule
}

func newResolveFixture(t *testing.T) resolveFixture {
	t.Helper()

	ctx := t.Context()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "categorization.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if migrateErr := sqlite.Migrate(ctx, db); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	store := sqlite.NewStore(db)
	if _, baselineErr := store.EnsureBaseline(ctx, "IDR", "fingerprint"); baselineErr != nil {
		t.Fatalf("baseline: %v", baselineErr)
	}

	expense, found, err := store.FindAccount(ctx, constant.SeedExpenseAccount, constant.AccountKindExpense)
	if err != nil || !found {
		t.Fatalf("expense seed: found=%v err=%v", found, err)
	}

	income, err := store.CreateAccount(ctx, "Salary", constant.AccountKindIncome, "IDR")
	if err != nil {
		t.Fatalf("income account: %v", err)
	}

	expenseRule, err := store.CreateRule(ctx, entity.CategorizationRule{
		Pattern:    "coffee",
		Field:      constant.RuleFieldPayee,
		MatchKind:  constant.RuleMatchContains,
		AccountRef: expense.Ref,
	})
	if err != nil {
		t.Fatalf("expense rule: %v", err)
	}

	incomeRule, err := store.CreateRule(ctx, entity.CategorizationRule{
		Pattern:    "coffee shop",
		Field:      constant.RuleFieldPayee,
		MatchKind:  constant.RuleMatchExact,
		AccountRef: income.Ref,
		Priority:   5,
	})
	if err != nil {
		t.Fatalf("income rule: %v", err)
	}

	return resolveFixture{
		service:     categorization.New(store),
		expense:     expense,
		income:      income,
		expenseRule: expenseRule,
		incomeRule:  incomeRule,
	}
}

func TestResolveFiltersRulesByAccountKind(t *testing.T) {
	fixture := newResolveFixture(t)

	tests := []struct {
		name     string
		kind     string
		wantRef  string
		wantRule string
	}{
		{
			name:     "expense ignores an income-only exact rule",
			kind:     constant.AccountKindExpense,
			wantRef:  fixture.expense.Ref,
			wantRule: fixture.expenseRule.Ref,
		},
		{
			name:     "income ignores the expense rule",
			kind:     constant.AccountKindIncome,
			wantRef:  fixture.income.Ref,
			wantRule: fixture.incomeRule.Ref,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := fixture.service.Resolve(t.Context(), categorization.SuggestInput{
				Text: "COFFEE SHOP",
				Kind: tc.kind,
			})
			if err != nil {
				t.Fatalf("resolve: %v", err)
			}

			if got.AccountRef != tc.wantRef {
				t.Fatalf("account_ref = %q, want %q", got.AccountRef, tc.wantRef)
			}
			if got.RuleRef != tc.wantRule {
				t.Fatalf("rule_ref = %q, want %q", got.RuleRef, tc.wantRule)
			}
		})
	}
}
