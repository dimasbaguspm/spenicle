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
	EntryByRef(ctx context.Context, ref string) (entity.Entry, bool, error)
	ListEntries(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	VoidEntry(ctx context.Context, ref, reason string, at time.Time) (entity.Entry, error)
}

type Captures interface {
	InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
	CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error)
	CaptureByRef(ctx context.Context, ref string) (entity.Capture, bool, error)
	ListCaptures(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	UpdateCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
}

type Accounts interface {
	CountAccounts(ctx context.Context) (int, error)
	CreateAccount(ctx context.Context, name, kind, currency string) (entity.Account, error)
	FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error)
	AccountByRef(ctx context.Context, ref string) (entity.Account, bool, error)
	UpdateAccount(ctx context.Context, account entity.Account) (entity.Account, error)
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

type Payees interface {
	CreatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error)
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
	UpdatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error)
}

type Recurring interface {
	CreateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error)
	RecurringByRef(ctx context.Context, ref string) (entity.Recurring, bool, error)
	UpdateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error)
}

type RateSource interface {
	Daily(ctx context.Context) ([]entity.Rate, error)
}

type RateStore interface {
	SaveRates(ctx context.Context, rates []entity.Rate) error
	RateOn(ctx context.Context, base, quote string, on time.Time) (entity.Rate, bool, error)
}
