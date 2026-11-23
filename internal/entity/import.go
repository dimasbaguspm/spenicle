package entity

import (
	"errors"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

var (
	ErrImportConflict = errors.New("client id already names another statement")
	ErrImportClosed   = errors.New("import batch is already committed or rejected")
	ErrInvalidImport  = errors.New("invalid statement")
)

type ImportBatch struct {
	ID          int64
	Ref         string
	ClientID    string
	FileHash    string
	Filename    string
	Status      string
	RowsTotal   int
	Currency    string
	CreatedAt   time.Time
	ExpiresAt   time.Time
	CommittedAt *time.Time
	RejectedAt  *time.Time
	Rows        []ImportRow
}

func (b ImportBatch) IsClosed() bool {
	return b.Status == constant.ImportStatusCommitted || b.Status == constant.ImportStatusRejected
}

type ImportRow struct {
	ID            int64
	Ref           string
	BatchID       int64
	RowIndex      int
	OccurredOn    time.Time
	AmountMinor   int64
	Description   string
	AccountRef    string
	CategoryRef   string
	PayeeRef      string
	Status        string
	ClashKind     string
	ClashEntryRef string
	EditedAt      *time.Time
	EditedFields  string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type ImportFilter struct {
	Status string
	Cursor string
	Limit  int
}

type ImportEvent struct {
	ID       int64
	Ref      string
	BatchID  int64
	Kind     string
	RowIndex *int
	Payload  string
	Actor    string
	At       time.Time
}

type ImportEventFilter struct {
	BatchID int64
	Cursor  string
	Limit   int
}

type EntryProbe struct {
	OccurredOn  time.Time
	Currency    string
	AmountMinor int64
	AccountRef  string
	DayWindow   int
}
