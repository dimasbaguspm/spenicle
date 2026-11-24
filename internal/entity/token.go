package entity

import (
	"errors"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

var (
	ErrUnknownScope = errors.New("unknown scope")
	ErrScopeMissing = errors.New("a token needs at least one scope")
	ErrTokenName    = errors.New("a token needs a name")
)

// Token is the non-root credential: the API answers it with exactly the scopes
// it was created with, and it can never mint another token. The root password
// (the session cookie) is not a token and carries every scope.
type Token struct {
	ID         int64
	Ref        string
	Name       string
	Preview    string
	Digest     string
	Scopes     []string
	CreatedAt  time.Time
	LastUsedAt *time.Time
	RevokedAt  *time.Time
}

// TokenFilter narrows the listing: by state, and by whether it was ever used.
type TokenFilter struct {
	Status string
	Used   string
	Cursor string
	Limit  int
}

func (t Token) Active() bool { return t.RevokedAt == nil }

func (t Token) Has(scope string) bool {
	for _, granted := range t.Scopes {
		if granted == constant.ScopeAll || granted == constant.ScopeAdmin || granted == scope {
			return true
		}
	}

	return false
}

func (t Token) ScopeList() string { return strings.Join(t.Scopes, " ") }

// KnownScope answers whether a scope string is part of the table the API
// documents. A token that asked for a typo would silently authenticate and
// silently fail every call, so the create path refuses it instead.
func KnownScope(scope string) bool {
	switch scope {
	case constant.ScopeAll, constant.ScopeAdmin,
		constant.ScopeEntriesRead, constant.ScopeEntriesWrite,
		constant.ScopeCapturesRead, constant.ScopeCapturesWrite,
		constant.ScopeAccountsRead, constant.ScopeAccountsWrite,
		constant.ScopePayeesRead, constant.ScopePayeesWrite,
		constant.ScopeRecurringRead, constant.ScopeRecurringWrite,
		constant.ScopeImportsRead, constant.ScopeImportsWrite,
		constant.ScopeExportsRead, constant.ScopeExportsWrite,
		constant.ScopeAnalyticsRead, constant.ScopeAuditRead,
		constant.ScopeDashboardRead, constant.ScopeSettingsRead,
		constant.ScopeRatesRead:
		return true
	default:
		return false
	}
}
