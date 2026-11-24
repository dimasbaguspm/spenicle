package constant

const (
	RuleFieldPayee = "payee"
	RuleFieldNote  = "note"
)

const (
	RuleMatchExact    = "exact"
	RuleMatchContains = "contains"
	RuleMatchPrefix   = "prefix"
)

const (
	SuggestionTierPayeeDefault = "payee_default"
	SuggestionTierRuleExact    = "rule_exact"
	SuggestionTierRuleContains = "rule_contains"
	SuggestionTierNone         = "none"
)

const (
	RulePatternMinLength = 2
	RulePatternMaxLength = 80
)
