package categorization

import (
	"context"
	"fmt"
	"slices"
	"strconv"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

var _ Contract = (*Service)(nil)

func (s *Service) Resolve(ctx context.Context, in SuggestInput) (Suggestion, error) {
	out, err := s.ResolveMany(ctx, []SuggestInput{in})
	if err != nil {
		return Suggestion{}, err
	}

	return out[0], nil
}

func (s *Service) ResolveMany(ctx context.Context, inputs []SuggestInput) ([]Suggestion, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Categorization.ResolveMany")
	defer endSpan()

	if len(inputs) == 0 {
		return nil, nil
	}

	rules, err := s.store.ListLiveRules(ctx)
	if err != nil {
		return nil, err
	}

	accounts := make(map[string]entity.Account, len(inputs))
	out := make([]Suggestion, 0, len(inputs))

	for _, in := range inputs {
		payeeName := in.Text
		defaultCategory := ""

		if in.PayeeRef != "" {
			payee, found, err := s.store.PayeeByRef(ctx, in.PayeeRef)
			if err != nil {
				return nil, err
			}

			if !found {
				return nil, fmt.Errorf("%w: payee %s", entity.ErrNotFound, in.PayeeRef)
			}

			payeeName = payee.Name

			if defaultCategory, err = s.defaultCategory(ctx, in.Kind, payee.DefaultCategoryRef); err != nil {
				return nil, err
			}
		}

		kept := rules
		if in.Kind != "" {
			kept = keepKind(in.Kind, rules)
		}

		resolved, err := s.describe(ctx, Suggest(payeeName, in.Text, defaultCategory, kept), accounts)
		if err != nil {
			return nil, err
		}

		out = append(out, resolved)
	}

	return out, nil
}

func (s *Service) defaultCategory(ctx context.Context, kind, ref string) (string, error) {
	if ref == "" {
		return "", nil
	}

	account, found, err := s.store.AccountByRef(ctx, ref)
	if err != nil {
		return "", err
	}

	if !found || account.ArchivedAt != nil {
		return "", nil
	}

	if kind != "" && account.Kind != kind {
		return "", nil
	}

	return ref, nil
}

func keepKind(kind string, rules []entity.CategorizationRule) []entity.CategorizationRule {
	kept := make([]entity.CategorizationRule, 0, len(rules))

	for _, rule := range rules {
		if rule.AccountKind == kind {
			kept = append(kept, rule)
		}
	}

	return kept
}

func (s *Service) unsorted(ctx context.Context, cache map[string]entity.Account) (entity.Account, error) {
	key := constant.SeedExpenseAccount + "/" + constant.AccountKindExpense

	if cached, ok := cache[key]; ok {
		return cached, nil
	}

	account, found, err := s.store.FindAccount(ctx, constant.SeedExpenseAccount, constant.AccountKindExpense)
	if err != nil {
		return entity.Account{}, err
	}

	if !found {
		return entity.Account{}, nil
	}

	cache[key] = account

	return account, nil
}

func (s *Service) describe(
	ctx context.Context,
	resolved entity.CategorySuggestion,
	cache map[string]entity.Account,
) (Suggestion, error) {
	out := Suggestion{
		AccountRef: resolved.AccountRef,
		Why:        resolved.Why,
		Tier:       resolved.Tier,
		RuleRef:    resolved.RuleRef,
	}

	if resolved.AccountRef == "" {
		fallback, err := s.unsorted(ctx, cache)
		if err != nil {
			return Suggestion{}, err
		}

		out.AccountRef = fallback.Ref
		out.AccountName = fallback.Name

		return out, nil
	}

	account, cached := cache[resolved.AccountRef]
	if !cached {
		fresh, found, err := s.store.AccountByRef(ctx, resolved.AccountRef)
		if err != nil {
			return Suggestion{}, err
		}

		if !found {
			return out, nil
		}

		account = fresh
		cache[resolved.AccountRef] = fresh
	}

	out.AccountName = account.Name

	return out, nil
}

func Suggest(
	payeeName, note, payeeDefaultCategoryRef string,
	rules []entity.CategorizationRule,
) entity.CategorySuggestion {
	if payeeDefaultCategoryRef != "" {
		return entity.CategorySuggestion{
			AccountRef: payeeDefaultCategoryRef,
			Why:        "the payee already carries this default category",
			Tier:       constant.SuggestionTierPayeeDefault,
		}
	}

	if rule, ok := bestRule(rules, constant.RuleFieldPayee,
		[]string{constant.RuleMatchExact}, payeeName, note); ok {
		return suggestionOf(rule, constant.SuggestionTierRuleExact)
	}

	if rule, ok := bestRule(rules, constant.RuleFieldPayee,
		[]string{constant.RuleMatchContains, constant.RuleMatchPrefix}, payeeName, note); ok {
		return suggestionOf(rule, constant.SuggestionTierRuleContains)
	}

	if rule, ok := bestRule(rules, constant.RuleFieldNote,
		[]string{constant.RuleMatchContains, constant.RuleMatchPrefix}, payeeName, note); ok {
		return suggestionOf(rule, constant.SuggestionTierRuleContains)
	}

	return entity.CategorySuggestion{
		Why:  "no payee default and no live rule matched",
		Tier: constant.SuggestionTierNone,
	}
}

func bestRule(
	rules []entity.CategorizationRule,
	field string,
	kinds []string,
	payeeName, note string,
) (entity.CategorizationRule, bool) {
	var best entity.CategorizationRule

	found := false

	for _, rule := range rules {
		if rule.Field != field || !slices.Contains(kinds, rule.MatchKind) {
			continue
		}

		if rule.ArchivedAt != nil || rule.AccountRef == "" {
			continue
		}

		if !entity.MatchRule(rule, payeeName, note) {
			continue
		}

		if !found || outranks(rule, best) {
			best = rule
			found = true
		}
	}

	return best, found
}

func outranks(candidate, current entity.CategorizationRule) bool {
	if candidate.Priority != current.Priority {
		return candidate.Priority > current.Priority
	}

	if len(candidate.Pattern) != len(current.Pattern) {
		return len(candidate.Pattern) > len(current.Pattern)
	}

	return candidate.CreatedAt.Before(current.CreatedAt)
}

func suggestionOf(rule entity.CategorizationRule, tier string) entity.CategorySuggestion {
	return entity.CategorySuggestion{
		AccountRef: rule.AccountRef,
		Why:        whyFor(rule),
		Tier:       tier,
		RuleRef:    rule.Ref,
	}
}

func whyFor(rule entity.CategorizationRule) string {
	subject := "the payee name"
	if rule.Field == constant.RuleFieldNote {
		subject = "the note"
	}

	switch rule.MatchKind {
	case constant.RuleMatchExact:
		return subject + " is exactly " + strconv.Quote(rule.Pattern)
	case constant.RuleMatchPrefix:
		return subject + " starts with " + strconv.Quote(rule.Pattern)
	default:
		return subject + " contains " + strconv.Quote(rule.Pattern)
	}
}
