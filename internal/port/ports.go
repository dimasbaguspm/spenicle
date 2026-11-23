// Package port declares the interfaces the core needs from the outside world.
// Adapters implement them; the use cases only ever see these.
package port

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/domain"
)

// Clock makes time injectable so use cases stay testable.
type Clock interface {
	Now() time.Time
}

// IDs mints client and server identifiers.
type IDs interface {
	NewID() string
}

// Sealer encrypts the sensitive columns and artifacts under APP_SECRET.
type Sealer interface {
	Seal(plain []byte) (string, error)
	Open(sealed string) ([]byte, error)
	Fingerprint() string
}

// Ledger is the write side of the book of record.
type Ledger interface {
	InsertEntry(ctx context.Context, e domain.Entry) (domain.Entry, error)
	EntryByClientID(ctx context.Context, clientID string) (domain.Entry, bool, error)
}

// Captures is the review queue.
type Captures interface {
	InsertCapture(ctx context.Context, c domain.Capture) (domain.Capture, error)
	CaptureByDedupeKey(ctx context.Context, key string) (domain.Capture, bool, error)
}

// Health answers questions a monitor and the boot sequence ask.
type Health interface {
	SchemaVersion(ctx context.Context) (int, error)
	Ping(ctx context.Context) error
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
}

// BaseCurrency reports the locked reporting currency.
type BaseCurrency interface {
	Code(ctx context.Context) (string, error)
}

// Accounts seeds and reads ledger accounts. Categories are accounts too, so
// this port covers both pickers.
type Accounts interface {
	CountAccounts(ctx context.Context) (int, error)
	CreateAccount(ctx context.Context, name, kind, currency string) (int64, error)
	FindAccount(ctx context.Context, name, kind string) (int64, bool, error)
}
