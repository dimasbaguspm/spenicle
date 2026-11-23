package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const importGCBatch = 50

func (r *Runner) collectImports(ctx context.Context, now time.Time) {
	start := time.Now()

	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Imports.GC")
	defer endSpan()

	if r.imports == nil || r.files == nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobImports, telemetry.OutcomeSkipped, 0, time.Since(start))

		return
	}

	expired, err := r.imports.ExpiredImportBatches(ctx, now, importGCBatch)
	if err != nil {
		telemetry.RecordWorkerRun(ctx, telemetry.JobImports, telemetry.OutcomeFailed, 0, time.Since(start))
		r.logger.Warn(ctx, "import gc could not read the expired drafts", slog.Any("error", err))

		return
	}

	dropped := 0

	for _, batch := range expired {
		if dropErr := r.dropDraft(ctx, batch, now); dropErr != nil {
			r.logger.Warn(ctx, "import gc could not drop a draft",
				slog.String("ref", batch.Ref), slog.Any("error", dropErr))

			continue
		}

		dropped++
	}

	telemetry.RecordWorkerRun(ctx, telemetry.JobImports, telemetry.OutcomeOK,
		int64(dropped), time.Since(start))
}

func (r *Runner) dropDraft(ctx context.Context, batch entity.ImportBatch, now time.Time) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Imports.DropDraft")
	defer endSpan()

	telemetry.Ref(ctx, batch.Ref)

	if err := r.files.Remove(ctx, batch.FileHash); err != nil {
		return fmt.Errorf("remove statement blob: %w", err)
	}

	dropped, err := r.imports.DropImportBatch(ctx, batch.Ref, entity.ImportEvent{
		Kind:  constant.ImportEventExpired,
		Actor: constant.ImportActorWorker,
		At:    now,
	})
	if err != nil {
		return err
	}

	r.logger.Info(ctx, "import gc dropped an expired draft",
		slog.String("ref", batch.Ref),
		slog.String("file_hash", batch.FileHash),
		slog.Int("rows", dropped))

	return nil
}
