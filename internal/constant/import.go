package constant

const (
	ImportStatusDraft      = "draft"
	ImportStatusCommitting = "committing"
	ImportStatusCommitted  = "committed"
	ImportStatusRejected   = "rejected"

	ImportUploadStatusOpen      = "open"
	ImportUploadStatusComplete  = "complete"
	ImportUploadStatusAbandoned = "abandoned"

	ImportRowStatusPending  = "pending"
	ImportRowStatusAccepted = "accepted"
	ImportRowStatusSkipped  = "skipped"

	ImportClashAlreadyImported = "already_imported"
	ImportClashDuplicate       = "duplicate"
	ImportClashPossible        = "possible_duplicate"
	ImportClashInvalidRow      = "invalid_row"

	ImportActionCommit = "commit"
	ImportActionReject = "reject"

	ImportEventUploaded        = "uploaded"
	ImportEventResumed         = "resumed"
	ImportEventConflictRefused = "conflict_refused"
	ImportEventRowEdited       = "row_edited"
	ImportEventRowAccepted     = "row_accepted"
	ImportEventRowSkipped      = "row_skipped"
	ImportEventCommitting      = "committing"
	ImportEventCommitted       = "committed"
	ImportEventRejected        = "rejected"
	ImportEventExpired         = "expired"

	ImportActorUser   = "user"
	ImportActorWorker = "worker"
)
