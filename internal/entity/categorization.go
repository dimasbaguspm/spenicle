package entity

import (
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type CategorizationRule struct {
	ID          int64
	Ref         string
	Pattern     string
	Field       string
	MatchKind   string
	AccountRef  string
	AccountKind string
	Priority    int
	ArchivedAt  *time.Time
	CreatedAt   time.Time
}

type CategorizationFilter struct {
	AccountRef      string
	IncludeArchived bool
	Cursor          string
	Limit           int
}

type CategorySuggestion struct {
	AccountRef string
	Why        string
	Tier       string
	RuleRef    string
}

func MatchRule(rule CategorizationRule, payeeName, note string) bool {
	pattern := strings.ToLower(strings.TrimSpace(rule.Pattern))
	if pattern == "" {
		return false
	}

	subject := payeeName
	if rule.Field == constant.RuleFieldNote {
		subject = note
	}

	folded := strings.ToLower(strings.TrimSpace(subject))

	switch rule.MatchKind {
	case constant.RuleMatchExact:
		return folded == pattern
	case constant.RuleMatchPrefix:
		return strings.HasPrefix(folded, pattern)
	case constant.RuleMatchContains:
		return strings.Contains(folded, pattern)
	default:
		return false
	}
}
