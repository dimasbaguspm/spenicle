package entity

import (
	"errors"
	"time"
)

var (
	ErrExportConflict = errors.New("client id already names another export")
	ErrExportNotReady = errors.New("export is not ready")
	ErrExportFailed   = errors.New("export failed")
	ErrExportExpired  = errors.New("export expired")
)

type Export struct {
	ID            int64
	Ref           string
	ClientID      string
	Status        string
	Format        string
	SchemaVersion int
	CountsJSON    string
	FileHash      string
	Bytes         int64
	CreatedAt     time.Time
	StartedAt     *time.Time
	FinishedAt    *time.Time
	ExpiresAt     *time.Time
	FromOn        *time.Time
	ToOn          *time.Time
	ErrorMessage  string
}

type ExportFilter struct {
	Status string
	Format string
	Cursor string
	Limit  int
}

type ExportEvent struct {
	ID       int64
	Ref      string
	ExportID int64
	Kind     string
	Payload  string
	Actor    string
	At       time.Time
}

type ExportEventFilter struct {
	ExportID int64
	Cursor   string
	Limit    int
}
