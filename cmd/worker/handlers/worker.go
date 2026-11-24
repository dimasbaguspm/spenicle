// Package handlers runs the scheduled half of the product: the recurring rules
// that must land in the review queue with no browser open, the artifact and
// draft retention, and the export jobs.
//
// worker.go is the package's public surface: what a runner needs, what one run
// reports and the heartbeat /healthz reads. recurring.go implements the run.
package handlers

import (
	"context"
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/repository"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

type Store interface {
	DueRecurring(ctx context.Context, asOf time.Time, limit int) ([]entity.Recurring, error)
	AdvanceRecurring(ctx context.Context, ref string, from, to, postedAt time.Time) (bool, error)
	FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error)
	SetSetting(ctx context.Context, key, value string) error
}

type ArtifactFiles interface {
	Remove(ctx context.Context, sha string) error
	Put(ctx context.Context, artifact extraction.Artifact) (filestore.Record, error)
}

type PartFiles interface {
	Remove(ctx context.Context, key string) error
}

type TimeSource interface{ Now() time.Time }

type Summary struct {
	Queued  int
	Skipped int
	Failed  int
}

type Runner struct {
	rules       repository.Recurring
	store       Store
	queue       captures.Queue
	Intake      intake.Contract
	artifacts   repository.Artifacts
	imports     repository.Imports
	files       ArtifactFiles
	exportFiles ArtifactFiles
	parts       PartFiles
	retention   time.Duration
	jobs        exports.Contract
	documents   export.Deps
	staleAfter  time.Duration
	clock       TimeSource
	loc         *time.Location
	logger      *logging.Logger
}

func New(
	rules repository.Recurring,
	store Store,
	queue captures.Queue,
	artifacts repository.Artifacts,
	imports repository.Imports,
	files ArtifactFiles,
	exportFiles ArtifactFiles,
	parts PartFiles,
	retention time.Duration,
	jobs exports.Contract,
	documents export.Deps,
	staleAfter time.Duration,
	clock TimeSource,
	loc *time.Location,
	logger *logging.Logger,
) *Runner {
	if logger == nil {
		logger = logging.New(telemetry.ComponentWorker)
	}

	if loc == nil {
		loc = time.UTC
	}

	return &Runner{
		rules: rules, store: store, queue: queue, artifacts: artifacts,
		imports: imports, files: files, exportFiles: exportFiles, parts: parts,
		retention: retention,
		jobs:      jobs, documents: documents, staleAfter: staleAfter,
		clock: clock, loc: loc, logger: logger,
	}
}

func (r *Runner) record(ctx context.Context, at time.Time) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Handler.Record")
	defer endSpan()

	value := at.UTC().Format(constant.TimestampLayout)

	if err := r.store.SetSetting(ctx, constant.SettingWorkerLastRunAt, value); err != nil {
		r.logger.Warn(ctx, "worker heartbeat not stored", slog.Any("error", err))
	}
}

func (r *Runner) zone() *time.Location {
	if r.loc == nil {
		return time.UTC
	}

	return r.loc
}
