package entity

import "time"

// Audit is one row of the journal: what changed, who changed it and when. Rows
// are append-only and never edited, so a filter over (kind, ref, action) is the
// whole read surface.
type Audit struct {
	ID         int64
	Ref        string
	EntityKind string
	EntityID   *int64
	EntityRef  string
	Action     string
	ActorKind  string
	ActorRef   string
	FromJSON   string
	ToJSON     string
	At         time.Time
}

type AuditFilter struct {
	EntityKind string
	EntityRef  string
	Action     string
	ActorKind  string
	From       time.Time
	To         time.Time
	Cursor     string
	Limit      int
}

// Journal payloads are the typed facts a state change leaves. Each one carries
// the same validate tags the API uses, so appendAudit refuses a malformed one
// instead of storing a bag of keys.

// EntryCreated records a posted entry.
type EntryCreated struct {
	OccurredOn string `json:"occurred_on" validate:"required,datestr"`
	Currency   string `json:"currency"    validate:"required,currency"`
	Source     string `json:"source"      validate:"required,source"`
	Postings   int    `json:"postings"    validate:"required,min=2"`
}

// EntryPayee records the payee an entry was pointed at.
type EntryPayee struct {
	PayeeRef string `json:"payee_ref,omitempty" validate:"omitempty,ref"`
}

// EntryVoided records a void: the original and the reversal it produced.
type EntryVoided struct {
	VoidedEntryID   int64 `json:"voided_entry_id"   validate:"required,gt=0"`
	ReversalEntryID int64 `json:"reversal_entry_id" validate:"required,gt=0"`
}

// AccountChanged records a created or renamed account.
type AccountChanged struct {
	Name       string `json:"name,omitempty"        validate:"omitempty,min=1,max=200"`
	Kind       string `json:"kind,omitempty"        validate:"omitempty,accountkind"`
	Currency   string `json:"currency,omitempty"    validate:"omitempty,currency"`
	Icon       string `json:"icon,omitempty"        validate:"omitempty,max=64"`
	ParentRef  string `json:"parent_ref,omitempty"  validate:"omitempty,ref"`
	ArchivedAt string `json:"archived_at,omitempty"`
}

// PayeeChanged records a created, renamed or archived payee.
type PayeeChanged struct {
	Name       string `json:"name,omitempty"        validate:"omitempty,min=1,max=200"`
	ArchivedAt string `json:"archived_at,omitempty"`
}

// RecurringChanged records a rule that was created, steered or advanced.
type RecurringChanged struct {
	Cadence   string `json:"cadence,omitempty"     validate:"omitempty,cadence"`
	Amount    int64  `json:"amount,omitempty"`
	Currency  string `json:"currency,omitempty"    validate:"omitempty,currency"`
	State     string `json:"state,omitempty"       validate:"omitempty,recurringstate"`
	NextDueOn string `json:"next_due_on,omitempty" validate:"omitempty,datestr"`
}

// CaptureChanged records where a queue item is, and what it became.
type CaptureChanged struct {
	Kind             string `json:"kind,omitempty"               validate:"omitempty,capturekind"`
	Status           string `json:"status,omitempty"             validate:"omitempty,capturestatus"`
	ResolvedEntryRef string `json:"resolved_entry_ref,omitempty" validate:"omitempty,ref"`
}

// SettingChanged records a settings key. Never its value: one of them is sealed.
type SettingChanged struct {
	Key string `json:"key" validate:"required,min=1,max=100"`
}

// TokenChanged records a token that was minted or revoked.
type TokenChanged struct {
	Name      string   `json:"name,omitempty"       validate:"omitempty,min=1,max=100"`
	Scopes    []string `json:"scopes,omitempty"     validate:"omitempty,max=20,dive,scope"`
	RevokedAt string   `json:"revoked_at,omitempty"`
}

// RuleChanged records a categorization rule that was created, repointed or archived.
type RuleChanged struct {
	Pattern     string `json:"pattern,omitempty"      validate:"omitempty,min=2,max=80"`
	Field       string `json:"field,omitempty"        validate:"omitempty,rulefield"`
	MatchKind   string `json:"match_kind,omitempty"   validate:"omitempty,rulematch"`
	CategoryRef string `json:"category_ref,omitempty" validate:"omitempty,ref"`
	Priority    int    `json:"priority,omitempty"`
	ArchivedAt  string `json:"archived_at,omitempty"`
}

// SystemStarted records the build, service and start time of one supervised process.
type SystemStarted struct {
	Service       string `json:"service"        validate:"required,max=64"`
	Version       string `json:"version"        validate:"required,max=64"`
	SchemaVersion int    `json:"schema_version" validate:"required,min=1"`
	StartedAt     string `json:"started_at"     validate:"required,timestamp"`
}
