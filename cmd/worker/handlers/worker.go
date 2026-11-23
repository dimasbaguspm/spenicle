// Package handlers runs the scheduled half of the product: the recurring rules
// that must post their own ledger entry with no browser open.
//
// worker.go is the package's public surface: what a runner needs, what one run
// reports and the heartbeat /healthz reads. recurring.go implements the run.
package handlers

import (
	"context"
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Store interface {
	DueRecurring(ctx context.Context, asOf time.Time, limit int) ([]entity.Recurring, error)
	AdvanceRecurring(ctx context.Context, ref string, from, to, postedAt time.Time) (bool, error)
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
	FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error)
	SetSetting(ctx context.Context, key, value string) error
}

type ArtifactFiles interface {
	Remove(ctx context.Context, sha string) error
}

type TimeSource interface{ Now() time.Time }

type Summary struct {
	Posted  int
	Skipped int
	Failed  int
}

type Runner struct {
	rules     repository.Recurring
	store     Store
	entries   ledger.Contract
	artifacts repository.Artifacts
	imports   repository.Imports
	files     ArtifactFiles
	retention time.Duration
	clock     TimeSource
	logger    *slog.Logger
}

func New(
	rules repository.Recurring,
	store Store,
	entries ledger.Contract,
	artifacts repository.Artifacts,
	imports repository.Imports,
	files ArtifactFiles,
	retention time.Duration,
	clock TimeSource,
	logger *slog.Logger,
) *Runner {
	if logger == nil {
		logger = slog.Default()
	}

	return &Runner{
		rules: rules, store: store, entries: entries, artifacts: artifacts,
		imports: imports, files: files, retention: retention, clock: clock, logger: logger,
	}
}

func (r *Runner) record(ctx context.Context, at time.Time) {
	value := at.UTC().Format(constant.TimestampLayout)

	if err := r.store.SetSetting(ctx, constant.SettingWorkerLastRunAt, value); err != nil {
		r.logger.WarnContext(ctx, "worker heartbeat not stored", slog.Any("error", err))
	}
}
