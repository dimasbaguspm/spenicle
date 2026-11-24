// Package categorization suggests the category of a transaction from
// deterministic inputs only: the payee's own default and the live rules. Nothing
// here posts an entry, and nothing learns.
package categorization

import (
	"context"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Store interface {
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
	AccountByRef(ctx context.Context, ref string) (entity.Account, bool, error)
	FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error)
	ListLiveRules(ctx context.Context) ([]entity.CategorizationRule, error)
}

type Contract interface {
	Resolve(ctx context.Context, in SuggestInput) (Suggestion, error)
}

type SuggestInput struct {
	PayeeRef string
	Text     string
	Kind     string
}

type Suggestion struct {
	AccountRef  string
	AccountName string
	Why         string
	Tier        string
	RuleRef     string
}
