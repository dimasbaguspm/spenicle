package exports

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const staleMessage = "the export did not finish in time"

type Service struct {
	jobs      Jobs
	events    repository.ExportEvents
	versions  SchemaVersionSource
	blobs     ArtifactStore
	retention time.Duration
	clock     TimeSource
}

type (
	SchemaVersionSource interface {
		SchemaVersion(ctx context.Context) (int, error)
	}
	TimeSource interface{ Now() time.Time }
)

func New(
	jobs Jobs,
	events repository.ExportEvents,
	versions SchemaVersionSource,
	blobs ArtifactStore,
	retention time.Duration,
	clock TimeSource,
) *Service {
	return &Service{
		jobs: jobs, events: events, versions: versions,
		blobs: blobs, retention: retention, clock: clock,
	}
}

var _ Contract = (*Service)(nil)

func (s *Service) Create(ctx context.Context, in CreateInput) (entity.Export, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Create")
	defer endSpan()

	existing, found, err := s.jobs.ExportByClientID(ctx, in.ClientID)
	if err != nil {
		return entity.Export{}, false, err
	}

	if found {
		return s.resume(ctx, existing, in.Format)
	}

	version, err := s.versions.SchemaVersion(ctx)
	if err != nil {
		return entity.Export{}, false, fmt.Errorf("schema version: %w", err)
	}

	queued, err := s.jobs.InsertExport(ctx, entity.Export{
		ClientID:      in.ClientID,
		Status:        constant.ExportStatusQueued,
		Format:        in.Format,
		SchemaVersion: version,
		CreatedAt:     s.clock.Now(),
	})
	if err != nil {
		return s.raced(ctx, in, err)
	}

	if err := s.record(ctx, queued, constant.ExportEventQueued, constant.ExportActorUser); err != nil {
		return entity.Export{}, false, err
	}

	return queued, true, nil
}

func (s *Service) Get(ctx context.Context, ref string) (entity.Export, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Get")
	defer endSpan()

	return s.jobs.ExportByRef(ctx, ref)
}

func (s *Service) List(ctx context.Context, filter entity.ExportFilter) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.List")
	defer endSpan()

	return s.jobs.ListExports(ctx, filter)
}

func (s *Service) Events(
	ctx context.Context,
	ref string,
	filter entity.ExportEventFilter,
) ([]entity.ExportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Events")
	defer endSpan()

	job, found, err := s.jobs.ExportByRef(ctx, ref)
	if err != nil {
		return nil, err
	}

	if !found {
		return nil, fmt.Errorf("%w: export %s", entity.ErrNotFound, ref)
	}

	filter.ExportID = job.ID

	return s.events.ListExportEvents(ctx, filter)
}

func (s *Service) Download(ctx context.Context, ref string) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Download")
	defer endSpan()

	job, err := s.load(ctx, ref)
	if err != nil {
		return entity.Export{}, err
	}

	if job.Status != constant.ExportStatusReady {
		return entity.Export{}, statusError(job)
	}

	if err := s.record(ctx, job, constant.ExportEventDownloaded, constant.ExportActorUser); err != nil {
		return entity.Export{}, err
	}

	return job, nil
}

func (s *Service) Claim(ctx context.Context, limit int) ([]entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Claim")
	defer endSpan()

	if limit <= 0 || limit > maxClaim {
		limit = maxClaim
	}

	queued, err := s.jobs.QueuedExports(ctx, limit)
	if err != nil {
		return nil, err
	}

	now := s.clock.Now()
	claimed := make([]entity.Export, 0, len(queued))

	for _, job := range queued {
		won, err := s.jobs.ClaimExport(ctx, job.Ref, now)
		if err != nil {
			return nil, err
		}

		if !won {
			continue
		}

		if err := s.record(ctx, job, constant.ExportEventStarted, constant.ExportActorWorker); err != nil {
			return nil, err
		}

		started := now
		job.Status = constant.ExportStatusRunning
		job.StartedAt = &started

		claimed = append(claimed, job)
	}

	return claimed, nil
}

func (s *Service) Complete(
	ctx context.Context,
	ref, fileHash string,
	bytes int64,
	counts map[string]int,
) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Complete")
	defer endSpan()

	finished := s.clock.Now()
	expires := finished.Add(s.retention)

	done, err := s.jobs.FinishExport(ctx, entity.Export{
		Ref:        ref,
		FileHash:   fileHash,
		Bytes:      bytes,
		CountsJSON: encodeCounts(counts),
		FinishedAt: &finished,
		ExpiresAt:  &expires,
	})
	if err != nil {
		return entity.Export{}, err
	}

	if err := s.record(ctx, done, constant.ExportEventCompleted, constant.ExportActorWorker); err != nil {
		return entity.Export{}, err
	}

	return done, nil
}

func (s *Service) Fail(ctx context.Context, ref, message string) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Fail")
	defer endSpan()

	return s.fail(ctx, ref, message, constant.ExportEventFailed)
}

func (s *Service) Resume(ctx context.Context) (int, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Resume")
	defer endSpan()

	orphaned, err := s.jobs.StaleExports(ctx, s.clock.Now().Add(time.Second), maxResume)
	if err != nil {
		return 0, err
	}

	requeued := 0

	for _, job := range orphaned {
		swapped, swapErr := s.jobs.RequeueExport(ctx, job.Ref)
		if swapErr != nil {
			return requeued, swapErr
		}

		if !swapped {
			continue
		}

		recordErr := s.record(ctx, job, constant.ExportEventResumed, constant.ExportActorWorker)
		if recordErr != nil {
			return requeued, recordErr
		}

		requeued++
	}

	return requeued, nil
}

func (s *Service) Sweep(ctx context.Context, staleBefore time.Time) (Summary, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Sweep")
	defer endSpan()

	var summary Summary

	stale, err := s.jobs.StaleExports(ctx, staleBefore, maxSweep)
	if err != nil {
		return summary, err
	}

	for _, job := range stale {
		if _, failErr := s.fail(ctx, job.Ref, staleMessage, constant.ExportEventSwept); failErr != nil {
			return summary, failErr
		}

		summary.Swept++
	}

	expired, err := s.jobs.ExpiredExports(ctx, s.clock.Now(), maxSweep)
	if err != nil {
		return summary, err
	}

	for _, job := range expired {
		if expireErr := s.expire(ctx, job); expireErr != nil {
			return summary, expireErr
		}

		summary.Expired++
	}

	return summary, nil
}

func (s *Service) expire(ctx context.Context, job entity.Export) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Expire")
	defer endSpan()

	gone, err := s.jobs.ExpireExport(ctx, job.Ref, s.clock.Now())
	if err != nil {
		return err
	}

	if !gone {
		return nil
	}

	if err := s.discard(ctx, job); err != nil {
		return err
	}

	return s.record(ctx, job, constant.ExportEventExpired, constant.ExportActorWorker)
}

func (s *Service) fail(
	ctx context.Context,
	ref, message, kind string,
) (entity.Export, error) {
	failed, err := s.jobs.FailExport(ctx, ref, message, s.clock.Now())
	if err != nil {
		return entity.Export{}, err
	}

	if err := s.discard(ctx, failed); err != nil {
		return entity.Export{}, err
	}

	if err := s.record(ctx, failed, kind, constant.ExportActorWorker); err != nil {
		return entity.Export{}, err
	}

	return failed, nil
}

func (s *Service) discard(ctx context.Context, job entity.Export) error {
	if job.FileHash == "" || s.blobs == nil {
		return nil
	}

	if err := s.blobs.Remove(ctx, job.FileHash); err != nil {
		return fmt.Errorf("remove export blob: %w", err)
	}

	return nil
}

func (s *Service) resume(
	ctx context.Context,
	job entity.Export,
	format string,
) (entity.Export, bool, error) {
	if job.Format != format {
		return entity.Export{}, false, fmt.Errorf("%w: %s", entity.ErrExportConflict, job.ClientID)
	}

	if err := s.record(ctx, job, constant.ExportEventResumed, constant.ExportActorUser); err != nil {
		return entity.Export{}, false, err
	}

	return job, false, nil
}

func (s *Service) raced(
	ctx context.Context,
	in CreateInput,
	cause error,
) (entity.Export, bool, error) {
	existing, found, err := s.jobs.ExportByClientID(ctx, in.ClientID)
	if err != nil || !found {
		return entity.Export{}, false, cause
	}

	return s.resume(ctx, existing, in.Format)
}

func (s *Service) load(ctx context.Context, ref string) (entity.Export, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Load")
	defer endSpan()

	job, found, err := s.jobs.ExportByRef(ctx, ref)
	if err != nil {
		return entity.Export{}, err
	}

	if !found {
		return entity.Export{}, fmt.Errorf("%w: export %s", entity.ErrNotFound, ref)
	}

	return job, nil
}

func (s *Service) record(
	ctx context.Context,
	job entity.Export,
	kind, actor string,
) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Exports.Record")
	defer endSpan()

	_, err := s.events.InsertExportEvent(ctx, entity.ExportEvent{
		ExportID: job.ID,
		Kind:     kind,
		Actor:    actor,
		At:       s.clock.Now(),
	})
	if err != nil {
		return fmt.Errorf("record %s event: %w", kind, err)
	}

	return nil
}

func statusError(job entity.Export) error {
	switch job.Status {
	case constant.ExportStatusExpired:
		return fmt.Errorf("%w: %s", entity.ErrExportExpired, job.Ref)
	case constant.ExportStatusFailed:
		return fmt.Errorf("%w: %s", entity.ErrExportFailed, job.Ref)
	default:
		return fmt.Errorf("%w: %s is %s", entity.ErrExportNotReady, job.Ref, job.Status)
	}
}

func encodeCounts(counts map[string]int) string {
	if len(counts) == 0 {
		return ""
	}

	encoded, err := json.Marshal(counts)
	if err != nil {
		return ""
	}

	return string(encoded)
}
