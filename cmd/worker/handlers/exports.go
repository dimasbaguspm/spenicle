package handlers

import (
	"context"
	"fmt"
	"log/slog"
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
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Exports.Run")
	defer endSpan()

	if r.jobs == nil || r.files == nil {
		return
	}

	claimed, err := r.jobs.Claim(ctx, exportJobBatch)
	if err != nil {
		r.logger.WarnContext(ctx, "export worker could not claim a job", slog.Any("error", err))

		return
	}

	rendered, failed := r.renderExports(ctx, claimed)

	swept, err := r.jobs.Sweep(ctx, now.Add(-r.staleAfter))
	if err != nil {
		r.logger.WarnContext(ctx, "export sweep failed", slog.Any("error", err))

		return
	}

	r.logger.InfoContext(ctx, "export run finished",
		slog.Int("claimed", len(claimed)),
		slog.Int("rendered", rendered),
		slog.Int("failed", failed),
		slog.Int("swept", swept.Swept),
		slog.Int("expired", swept.Expired))
}

func (r *Runner) renderExports(ctx context.Context, claimed []entity.Export) (int, int) {
	rendered, failed := 0, 0

	for _, job := range claimed {
		if renderErr := r.renderExport(ctx, job); renderErr != nil {
			failed++

			r.logger.WarnContext(ctx, "export job failed",
				slog.String("ref", job.Ref), slog.Any("error", renderErr))
			r.abandonExport(ctx, job)

			continue
		}

		rendered++
	}

	return rendered, failed
}

func (r *Runner) renderExport(ctx context.Context, job entity.Export) error {
	document, err := export.Render(ctx, r.documents, job.Format)
	if err != nil {
		return fmt.Errorf("render %s export: %w", job.Format, err)
	}

	record, err := r.files.Put(ctx, extraction.Artifact{
		Filename:    "spenicle." + document.Extension,
		ContentType: document.ContentType,
		Bytes:       document.Bytes,
	})
	if err != nil {
		return fmt.Errorf("store export: %w", err)
	}

	_, err = r.jobs.Complete(ctx, job.Ref, record.SHA256, int64(len(document.Bytes)), document.Counts)

	return err
}

func (r *Runner) abandonExport(ctx context.Context, job entity.Export) {
	if _, err := r.jobs.Fail(ctx, job.Ref, exportFailure); err != nil {
		r.logger.WarnContext(ctx, "export job could not be marked failed",
			slog.String("ref", job.Ref), slog.Any("error", err))
	}
}
