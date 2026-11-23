// Package constant holds every fixed value the code shares. If a literal is
// used in more than one package, it belongs here; if it is used once, it stays
// where it is read.
package constant

import "time"

const (
	// DateLayout is the wire and storage format for a calendar day.
	DateLayout = "2006-01-02"
	// TimestampLayout is RFC 3339, UTC, for everything that is not a date.
	TimestampLayout = time.RFC3339
	// ISOCodeLength is the width of every ISO 4217 code.
	ISOCodeLength = 3
)

// Account kinds. Categories are accounts too, so these four cover both pickers.
const (
	AccountKindAsset     = "asset"
	AccountKindLiability = "liability"
	AccountKindExpense   = "expense"
	AccountKindIncome    = "income"
)

// Where an entry came from. Provenance is part of the record, not a log line.
const (
	EntrySourceManual     = "manual"
	EntrySourceShare      = "share"
	EntrySourceEmail      = "email"
	EntrySourceStatement  = "statement"
	EntrySourceRecurring  = "recurring"
	EntrySourceAdjustment = "adjustment"
)

// How a base amount was produced.
const (
	FXSourceECB      = "ecb"
	FXSourceCached   = "cached"
	FXSourceManual   = "manual"
	FXSourceIdentity = "identity"
)

// Capture channels.
const (
	CaptureKindShare     = "share"
	CaptureKindImage     = "image"
	CaptureKindEmail     = "email"
	CaptureKindStatement = "statement"
	CaptureKindRecurring = "recurring"
	CaptureKindManual    = "manual"
)

// Capture lifecycle. Approved is terminal; rejected may be reopened.
const (
	CaptureStatusExtracting = "extracting"
	CaptureStatusPending    = "pending"
	CaptureStatusDuplicate  = "duplicate"
	CaptureStatusApproved   = "approved"
	CaptureStatusRejected   = "rejected"
	CaptureStatusFailed     = "failed"
)

// Settings keys stored in the settings table. Only two rows: the fingerprint, and
// the JSON blob the application decodes into entity.Settings.
const (
	SettingAppSettings       = "app_settings"
	SettingSecretFingerprint = "secret_fingerprint"
	// SettingLegacyBaseCurrency is the pre-JSON row, migrated into app_settings.
	SettingLegacyBaseCurrency = "base_currency"
)

// SessionCookie is the cookie name the browser and the tests use.
const SessionCookie = "spenicle_session"

// Seed accounts created on an empty database.
const (
	SeedAssetAccount   = "Cash"
	SeedExpenseAccount = "Unsorted"
)

// SnapToJSON snap states. The vendor owns these words; mapping them to capture
// statuses happens in one place, the captures module.
const (
	SnapStatusRegistered = "REGISTERED"
	SnapStatusExecuting  = "EXECUTING"
	SnapStatusCompleted  = "COMPLETED"
	SnapStatusFailed     = "FAILED"
)
