package entity_test

import (
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestMatchRule(t *testing.T) {
	tests := []struct {
		name      string
		pattern   string
		field     string
		matchKind string
		payeeName string
		note      string
		want      bool
	}{
		{
			name:      "an exact rule folds the case of both sides",
			pattern:   "whiskas",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchExact,
			payeeName: "WHISKAS",
			want:      true,
		},
		{
			name:      "an exact rule refuses a longer subject",
			pattern:   "whiskas",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchExact,
			payeeName: "WHISKAS ADULT",
			want:      false,
		},
		{
			name:      "a contains rule fires inside the subject",
			pattern:   "indomaret",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchContains,
			payeeName: "INDOMARET POINT BSD",
			want:      true,
		},
		{
			name:      "a prefix rule anchors the subject",
			pattern:   "KOPI KENANGAN",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchPrefix,
			payeeName: "kopi kenangan senayan",
			note:      "ignored",
			want:      true,
		},
		{
			name:      "a prefix rule refuses a subject that only contains it",
			pattern:   "kopi",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchPrefix,
			payeeName: "ES KOPI",
			want:      false,
		},
		{
			name:      "a note rule reads the note and not the payee",
			pattern:   "warung",
			field:     constant.RuleFieldNote,
			matchKind: constant.RuleMatchContains,
			payeeName: "WARUNG PAK HAR",
			want:      false,
		},
		{
			name:      "the stored pattern is compared after trimming",
			pattern:   "  indomaret  ",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchContains,
			payeeName: "INDOMARET",
			want:      true,
		},
		{
			name:      "an empty pattern never matches",
			pattern:   "   ",
			field:     constant.RuleFieldPayee,
			matchKind: constant.RuleMatchContains,
			payeeName: "WHISKAS",
			want:      false,
		},
		{
			name:      "an unknown match kind never matches",
			pattern:   "whiskas",
			field:     constant.RuleFieldPayee,
			matchKind: "regex",
			payeeName: "WHISKAS",
			want:      false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rule := entity.CategorizationRule{
				Pattern:   tc.pattern,
				Field:     tc.field,
				MatchKind: tc.matchKind,
			}

			if got := entity.MatchRule(rule, tc.payeeName, tc.note); got != tc.want {
				t.Fatalf("MatchRule(%q) = %v, want %v", tc.payeeName, got, tc.want)
			}
		})
	}
}
