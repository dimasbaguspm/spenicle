package handlers

import (
	"context"
	"log/slog"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const gcBatch = 200

func (r *Runner) collect(ctx context.Context, now time.Time) {
	start := time.Now()

	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Artifacts.GC")
	defer endSpan()

	if r.artifacts == nil || r.files == nil || r.retention <= 0 {
		telemetry.RecordWorkerRun(ctx, telemetry.JobArtifacts, telemetry.OutcomeSkipped, 0, time.Since(start))

		return
	}

	expired, err := r.artifacts.ExpiredArtifacts(ctx, now.Add(-r.retention), gcBatch)
	if err != nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobArtifacts, telemetry.OutcomeFailed, 0, time.Since(start))
		r.logger.Warn(ctx, "artifact gc could not read the expired rows", slog.Any("error", err))

		return
	}

	var (
		removed int
		freed   int64
	)

	for _, artifact := range expired {
		if !r.reclaim(ctx, artifact, now) {
			continue
		}

		removed++
		freed += artifact.StoredBytes
	}

	telemetry.RecordWorkerRun(ctx, telemetry.JobArtifacts, telemetry.OutcomeOK,
		int64(removed), time.Since(start))

	if removed > 0 {
		r.logger.Info(ctx, "artifact gc finished",
			slog.Int("removed", removed), slog.Int64("freed_bytes", freed))
	}
}

func (r *Runner) reclaim(ctx context.Context, artifact entity.Artifact, at time.Time) bool {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Artifacts.Reclaim")
	defer endSpan()

	telemetry.Ref(ctx, artifact.Ref)

	if err := r.files.Remove(ctx, artifact.SHA256); err != nil {
		r.logger.Warn(ctx, "artifact gc could not remove the file",
			slog.String("ref", artifact.Ref), slog.Any("error", err))

		return false
	}

	marked, err := r.artifacts.MarkArtifactDeleted(ctx, artifact.Ref, at)
	if err != nil {
		r.logger.Warn(ctx, "artifact gc could not mark the row deleted",
			slog.String("ref", artifact.Ref), slog.Any("error", err))

		return false
	}

	return marked
}
