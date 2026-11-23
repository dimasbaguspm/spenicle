package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const importGCBatch = 50

func (r *Runner) collectImports(ctx context.Context, now time.Time) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Imports.GC")
	defer endSpan()

	if r.imports == nil || r.files == nil {
		return
	}

	expired, err := r.imports.ExpiredImportBatches(ctx, now, importGCBatch)
	if err != nil {
		r.logger.WarnContext(ctx, "import gc could not read the expired drafts", slog.Any("error", err))

		return
	}

	for _, batch := range expired {
		if dropErr := r.dropDraft(ctx, batch); dropErr != nil {
			r.logger.WarnContext(ctx, "import gc could not drop a draft",
				slog.String("ref", batch.Ref), slog.Any("error", dropErr))
		}
	}
}

func (r *Runner) dropDraft(ctx context.Context, batch entity.ImportBatch) error {
	if err := r.files.Remove(ctx, batch.FileHash); err != nil {
		return fmt.Errorf("remove statement blob: %w", err)
	}

	dropped, err := r.imports.DropImportBatch(ctx, batch.Ref)
	if err != nil {
		return err
	}

	r.logger.InfoContext(ctx, "import gc dropped an expired draft",
		slog.String("ref", batch.Ref),
		slog.String("file_hash", batch.FileHash),
		slog.Int("rows", dropped))

	return nil
}
