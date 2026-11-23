// Package repository declares the contracts for everything outside this
// process: the database today, an extraction vendor tomorrow. Modules depend on
// these interfaces, never on a concrete adapter, which is what lets a second
// implementation plug in without touching business logic.
package repository

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Ledger interface {
	InsertEntry(ctx context.Context, entry entity.Entry) (entity.Entry, error)
	EntryByClientID(ctx context.Context, clientID string) (entity.Entry, bool, error)
	EntryByID(ctx context.Context, id int64) (entity.Entry, bool, error)
	ListEntries(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	VoidEntry(ctx context.Context, id int64, reason string, at time.Time) (entity.Entry, error)
}

type Captures interface {
	InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
	CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error)
	CaptureByID(ctx context.Context, id int64) (entity.Capture, bool, error)
	ListCaptures(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	UpdateCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
}

type Accounts interface {
	CountAccounts(ctx context.Context) (int, error)
	CreateAccount(ctx context.Context, name, kind, currency string) (int64, error)
	FindAccount(ctx context.Context, name, kind string) (int64, bool, error)
	ListAccounts(ctx context.Context) ([]entity.Account, error)
	BalancesByAccount(ctx context.Context) (map[int64]int64, error)
}

type System interface {
	SchemaVersion(ctx context.Context) (int, error)
	Ping(ctx context.Context) error
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
	HasEntries(ctx context.Context) (bool, error)
}
