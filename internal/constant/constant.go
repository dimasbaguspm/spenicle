// Package constant holds every fixed value the code shares. If a literal is
// used in more than one package, it belongs here; if it is used once, it stays
// where it is read.
package constant

import "time"

const (
	DateLayout      = "2006-01-02"
	TimestampLayout = time.RFC3339
	ISOCodeLength   = 3
)

const (
	AccountKindAsset     = "asset"
	AccountKindLiability = "liability"
	AccountKindExpense   = "expense"
	AccountKindIncome    = "income"
)

const (
	EntrySourceManual     = "manual"
	EntrySourceShare      = "share"
	EntrySourceEmail      = "email"
	EntrySourceStatement  = "statement"
	EntrySourceRecurring  = "recurring"
	EntrySourceAdjustment = "adjustment"
)

const (
	FXSourceECB      = "ecb"
	FXSourceCached   = "cached"
	FXSourceManual   = "manual"
	FXSourceIdentity = "identity"
)

const (
	CaptureKindShare     = "share"
	CaptureKindImage     = "image"
	CaptureKindEmail     = "email"
	CaptureKindStatement = "statement"
	CaptureKindRecurring = "recurring"
	CaptureKindManual    = "manual"
)

const (
	CaptureStatusExtracting = "extracting"
	CaptureStatusPending    = "pending"
	CaptureStatusDuplicate  = "duplicate"
	CaptureStatusApproved   = "approved"
	CaptureStatusRejected   = "rejected"
	CaptureStatusFailed     = "failed"
)

const (
	SettingAppSettings       = "app_settings"
	SettingSecretFingerprint = "secret_fingerprint"
	SettingWorkerLastRunAt   = "worker_last_run_at"
)

const (
	RecurringOriginUser     = "user"
	RecurringOriginDetected = "detected"

	RecurringStateSuggested = "suggested"
	RecurringStateActive    = "active"
	RecurringStatePaused    = "paused"
	RecurringStateEnded     = "ended"

	RecurringCadenceDaily   = "daily"
	RecurringCadenceWeekly  = "weekly"
	RecurringCadenceMonthly = "monthly"
	RecurringCadenceYearly  = "yearly"

	ShiftNone = "none"
	ShiftNext = "next"
	ShiftPrev = "prev"
)

const (
	ImportStatusDraft     = "draft"
	ImportStatusCommitted = "committed"
	ImportStatusRejected  = "rejected"

	ImportRowStatusPending  = "pending"
	ImportRowStatusAccepted = "accepted"
	ImportRowStatusSkipped  = "skipped"

	ImportClashAlreadyImported = "already_imported"
	ImportClashDuplicate       = "duplicate"
	ImportClashPossible        = "possible_duplicate"
	ImportClashInvalidRow      = "invalid_row"
)

const SessionCookie = "spenicle_session"

const (
	SeedAssetAccount   = "Cash"
	SeedExpenseAccount = "Unsorted"
)

const (
	SnapStatusRegistered = "REGISTERED"
	SnapStatusExecuting  = "EXECUTING"
	SnapStatusCompleted  = "COMPLETED"
	SnapStatusFailed     = "FAILED"
)
