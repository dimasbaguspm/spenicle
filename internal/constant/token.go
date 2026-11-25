package constant

// A token carries the scopes it was created with. The instance password is not a
// scope: it is the root credential, and it answers every route.
const (
	ScopeAll                 = "*"
	ScopeAdmin               = "admin"
	ScopeEntriesRead         = "entries:read"
	ScopeEntriesWrite        = "entries:write"
	ScopeCapturesRead        = "captures:read"
	ScopeCapturesWrite       = "captures:write"
	ScopeAccountsRead        = "accounts:read"
	ScopeAccountsWrite       = "accounts:write"
	ScopePayeesRead          = "payees:read"
	ScopePayeesWrite         = "payees:write"
	ScopeRecurringRead       = "recurring:read"
	ScopeRecurringWrite      = "recurring:write"
	ScopeImportsRead         = "imports:read"
	ScopeImportsWrite        = "imports:write"
	ScopeExportsRead         = "exports:read"
	ScopeExportsWrite        = "exports:write"
	ScopeAnalyticsRead       = "analytics:read"
	ScopeAnalyticsWrite      = "analytics:write"
	ScopeAuditRead           = "audit:read"
	ScopeDashboardRead       = "dashboard:read"
	ScopeSettingsRead        = "settings:read"
	ScopeRatesRead           = "rates:read"
	ScopeCategorizationRead  = "categorization:read"
	ScopeCategorizationWrite = "categorization:write"
)

const (
	TokenStatusActive  = "active"
	TokenStatusRevoked = "revoked"

	TokenUsed   = "used"
	TokenUnused = "never"
)
