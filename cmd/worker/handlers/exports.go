package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

const (
	exportJobBatch = 5
	exportFailure  = "the export could not be rendered"
)

func (r *Runner) runExports(ctx context.Context, now time.Time) {
	start := time.Now()

	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Exports.Run")
	defer endSpan()

	if r.jobs == nil || r.exportFiles == nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobExports, telemetry.OutcomeSkipped, 0, time.Since(start))

		return
	}

	requeued, err := r.jobs.Resume(ctx)
	if err != nil {
		r.logger.Warn(ctx, "export worker could not resume orphaned jobs", slog.Any("error", err))
	}

	claimed, err := r.jobs.Claim(ctx, exportJobBatch)
	if err != nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobExports, telemetry.OutcomeFailed, 0, time.Since(start))
		r.logger.Warn(ctx, "export worker could not claim a job", slog.Any("error", err))

		return
	}

	rendered, failed := r.renderExports(ctx, claimed)

	outcome := telemetry.OutcomeOK
	if failed > 0 {
		outcome = telemetry.OutcomeFailed
	}

	telemetry.RecordWorkerRun(ctx, telemetry.JobExports, outcome, int64(rendered), time.Since(start))

	swept, err := r.jobs.Sweep(ctx, now.Add(-r.staleAfter))
	if err != nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobSweep, telemetry.OutcomeFailed, 0, time.Since(start))
		r.logger.Warn(ctx, "export sweep failed", slog.Any("error", err))

		return
	}

	telemetry.RecordWorkerRun(ctx, telemetry.JobSweep, telemetry.OutcomeOK,
		int64(swept.Swept+swept.Expired), time.Since(start))

	r.logger.Info(ctx, "export run finished",
		slog.Int("resumed", requeued),
		slog.Int("claimed", len(claimed)),
		slog.Int("rendered", rendered),
		slog.Int("failed", failed),
		slog.Int("swept", swept.Swept),
		slog.Int("expired", swept.Expired))
}

func (r *Runner) renderExports(ctx context.Context, claimed []entity.Export) (int, int) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Exports.RenderAll")
	defer endSpan()

	rendered, failed := 0, 0

	for _, job := range claimed {
		if renderErr := r.renderExport(ctx, job); renderErr != nil {
			failed++

			r.logger.Warn(ctx, "export job failed",
				slog.String("ref", job.Ref), slog.Any("error", renderErr))
			r.abandonExport(ctx, job)

			continue
		}

		rendered++
	}

	return rendered, failed
}

func (r *Runner) renderExport(ctx context.Context, job entity.Export) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Exports.Render")
	defer endSpan()

	telemetry.Ref(ctx, job.Ref)

	document, err := export.RenderFile(ctx, r.documents, job.Format, exportWindow(job), r.renderDir)
	if err != nil {
		return fmt.Errorf("render %s export: %w", job.Format, err)
	}

	defer func() { _ = os.Remove(document.Path) }()

	body, err := os.ReadFile(document.Path)
	if err != nil {
		return fmt.Errorf("read %s export: %w", job.Format, err)
	}

	record, err := r.exportFiles.Put(ctx, extraction.Artifact{
		Filename:    "spenicle." + document.Extension,
		ContentType: document.ContentType,
		Bytes:       body,
	})
	if err != nil {
		return fmt.Errorf("store export: %w", err)
	}

	telemetry.RecordExportBytes(ctx, int64(len(body)))

	_, err = r.jobs.Complete(ctx, job.Ref, record.SHA256, int64(len(body)), document.Counts)

	return err
}

func exportWindow(job entity.Export) *export.Window {
	if job.FromOn == nil || job.ToOn == nil {
		return nil
	}

	return &export.Window{From: *job.FromOn, To: *job.ToOn}
}

func (r *Runner) abandonExport(ctx context.Context, job entity.Export) {
	_, endSpan := telemetry.StartSpan(ctx, "Worker.Exports.Abandon")
	defer endSpan()

	if _, err := r.jobs.Fail(ctx, job.Ref, exportFailure); err != nil {
		r.logger.Warn(ctx, "export job could not be marked failed",
			slog.String("ref", job.Ref), slog.Any("error", err))
	}
}
