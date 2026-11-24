package categorization_test

import (
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
)

const (
	catRef     = "11111111111111111111111111111111"
	groceryRef = "22222222222222222222222222222222"
	foodRef    = "33333333333333333333333333333333"
)

func rule(
	ref, pattern, field, matchKind, accountRef string,
	priority int,
) entity.CategorizationRule {
	return entity.CategorizationRule{
		Ref:        ref,
		Pattern:    pattern,
		Field:      field,
		MatchKind:  matchKind,
		AccountRef: accountRef,
		Priority:   priority,
		CreatedAt:  time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
	}
}

func TestSuggest(t *testing.T) {
	whiskas := rule("a1", "whiskas", constant.RuleFieldPayee, constant.RuleMatchExact, catRef, 0)
	indomaret := rule("a2", "indomaret", constant.RuleFieldPayee, constant.RuleMatchContains, groceryRef, 0)
	kopi := rule("a3", "kopi kenangan", constant.RuleFieldPayee, constant.RuleMatchPrefix, foodRef, 0)
	warung := rule("a4", "warung", constant.RuleFieldNote, constant.RuleMatchContains, foodRef, 0)

	tests := []struct {
		name       string
		payeeName  string
		note       string
		defaultRef string
		rules      []entity.CategorizationRule
		wantRef    string
		wantTier   string
		wantRule   string
	}{
		{
			name:      "an exact rule names the category of WHISKAS",
			payeeName: "WHISKAS",
			rules:     []entity.CategorizationRule{whiskas},
			wantRef:   catRef,
			wantTier:  constant.SuggestionTierRuleExact,
			wantRule:  "a1",
		},
		{
			name:      "a contains rule names the category of INDOMARET",
			payeeName: "INDOMARET",
			rules:     []entity.CategorizationRule{indomaret},
			wantRef:   groceryRef,
			wantTier:  constant.SuggestionTierRuleContains,
			wantRule:  "a2",
		},
		{
			name:      "a prefix rule names the category of KOPI KENANGAN",
			payeeName: "KOPI KENANGAN",
			rules:     []entity.CategorizationRule{kopi},
			wantRef:   foodRef,
			wantTier:  constant.SuggestionTierRuleContains,
			wantRule:  "a3",
		},
		{
			name:      "a rule on the note fires after the payee name misses",
			payeeName: "WARTEG BAHARI",
			note:      "lunch at warung",
			rules:     []entity.CategorizationRule{warung},
			wantRef:   foodRef,
			wantTier:  constant.SuggestionTierRuleContains,
			wantRule:  "a4",
		},
		{
			name:       "the payee default beats an exact rule",
			payeeName:  "WHISKAS",
			defaultRef: foodRef,
			rules:      []entity.CategorizationRule{whiskas},
			wantRef:    foodRef,
			wantTier:   constant.SuggestionTierPayeeDefault,
		},
		{
			name:      "an exact rule beats a contains rule",
			payeeName: "KOPI KENANGAN",
			rules: []entity.CategorizationRule{
				rule("b1", "kopi", constant.RuleFieldPayee, constant.RuleMatchContains, groceryRef, 0),
				rule("b2", "kopi kenangan", constant.RuleFieldPayee, constant.RuleMatchExact, foodRef, 0),
			},
			wantRef:  foodRef,
			wantTier: constant.SuggestionTierRuleExact,
			wantRule: "b2",
		},
		{
			name:      "the higher priority wins inside one tier",
			payeeName: "INDOMARET",
			rules: []entity.CategorizationRule{
				rule("c1", "indomaret", constant.RuleFieldPayee, constant.RuleMatchContains, groceryRef, 0),
				rule("c2", "indomaret", constant.RuleFieldPayee, constant.RuleMatchPrefix, catRef, 5),
			},
			wantRef:  catRef,
			wantTier: constant.SuggestionTierRuleContains,
			wantRule: "c2",
		},
		{
			name:      "the longer pattern wins at the same priority",
			payeeName: "INDOMARET POINT",
			rules: []entity.CategorizationRule{
				rule("d1", "indomaret", constant.RuleFieldPayee, constant.RuleMatchContains, groceryRef, 0),
				rule("d2", "indomaret point", constant.RuleFieldPayee, constant.RuleMatchContains, catRef, 0),
			},
			wantRef:  catRef,
			wantTier: constant.SuggestionTierRuleContains,
			wantRule: "d2",
		},
		{
			name:      "the oldest rule wins when priority and length tie",
			payeeName: "INDOMARET",
			rules: []entity.CategorizationRule{
				rule("e2", "indomaret", constant.RuleFieldPayee, constant.RuleMatchContains, catRef, 0),
				{
					Ref:        "e1",
					Pattern:    "indomaret",
					Field:      constant.RuleFieldPayee,
					MatchKind:  constant.RuleMatchPrefix,
					AccountRef: groceryRef,
					CreatedAt:  time.Date(2025, time.January, 1, 0, 0, 0, 0, time.UTC),
				},
			},
			wantRef:  groceryRef,
			wantTier: constant.SuggestionTierRuleContains,
			wantRule: "e1",
		},
		{
			name:      "an archived rule never fires",
			payeeName: "WHISKAS",
			rules: []entity.CategorizationRule{
				archived(rule("f1", "whiskas", constant.RuleFieldPayee, constant.RuleMatchExact, catRef, 9)),
			},
			wantTier: constant.SuggestionTierNone,
		},
		{
			name:      "no match answers the none tier",
			payeeName: "TOKO ROTI",
			rules:     []entity.CategorizationRule{whiskas, indomaret},
			wantTier:  constant.SuggestionTierNone,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := categorization.Suggest(tc.payeeName, tc.note, tc.defaultRef, tc.rules)

			if got.AccountRef != tc.wantRef {
				t.Fatalf("account_ref = %q, want %q", got.AccountRef, tc.wantRef)
			}

			if got.Tier != tc.wantTier {
				t.Fatalf("tier = %q, want %q", got.Tier, tc.wantTier)
			}

			if got.RuleRef != tc.wantRule {
				t.Fatalf("rule_ref = %q, want %q", got.RuleRef, tc.wantRule)
			}

			if got.Why == "" {
				t.Fatal("every suggestion explains itself")
			}
		})
	}
}

func archived(rule entity.CategorizationRule) entity.CategorizationRule {
	at := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC)
	rule.ArchivedAt = &at

	return rule
}
