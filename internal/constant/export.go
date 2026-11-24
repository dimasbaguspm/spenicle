package constant

const (
	ExportStatusQueued  = "queued"
	ExportStatusRunning = "running"
	ExportStatusReady   = "ready"
	ExportStatusFailed  = "failed"
	ExportStatusExpired = "expired"

	ExportFormatJSON = "json"
	ExportFormatCSV  = "csv"

	ExportEventQueued     = "queued"
	ExportEventStarted    = "started"
	ExportEventCompleted  = "completed"
	ExportEventFailed     = "failed"
	ExportEventDownloaded = "downloaded"
	ExportEventExpired    = "expired"
	ExportEventSwept      = "swept"
	ExportEventResumed    = "resumed"

	ExportActorUser   = "user"
	ExportActorWorker = "worker"
)
