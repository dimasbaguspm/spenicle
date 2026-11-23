// Package repository declares the contracts for everything outside this
// process: the database today, an extraction vendor tomorrow. Modules depend on
// these interfaces, never on a concrete adapter, which is what lets a second
// implementation plug in without touching business logic.
package repository

import (
	"context"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// Ledger is the write side of the book of record.
type Ledger interface {
	InsertEntry(ctx context.Context, entry entity.Entry) (entity.Entry, error)
	EntryByClientID(ctx context.Context, clientID string) (entity.Entry, bool, error)
}

// Captures is the review queue.
type Captures interface {
	InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
	CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error)
}

// Accounts seeds and reads ledger accounts. Categories are accounts too, so this
// covers both pickers.
type Accounts interface {
	CountAccounts(ctx context.Context) (int, error)
	CreateAccount(ctx context.Context, name, kind, currency string) (int64, error)
	FindAccount(ctx context.Context, name, kind string) (int64, bool, error)
}

// System answers the questions a monitor and the boot sequence ask.
type System interface {
	SchemaVersion(ctx context.Context) (int, error)
	Ping(ctx context.Context) error
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
	BaseCurrencyCode(ctx context.Context) (string, error)
}
