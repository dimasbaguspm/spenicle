package handlers

import (
	"context"
	"errors"
	"log/slog"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
)

// runIntake polls the mailbox when one is configured. A mailbox that is off, or that
// the provider refuses, must never stall the rest of the tick: the failure is logged and
// the run carries on.
func (r *Runner) runIntake(ctx context.Context, now time.Time) {
	if r.Intake == nil {
		return
	}

	ctx, endSpan := telemetry.StartSpan(ctx, "Worker.Intake.Poll")
	defer endSpan()

	result, err := r.Intake.Poll(ctx, now)
	if errors.Is(err, intake.ErrNotConfigured) {
		return
	}

	if err != nil {
		r.logger.Warn(ctx, "intake poll failed", slog.Any("error", err))

		return
	}

	if result.Created+result.Skipped+result.Failed+result.Unchanged == 0 {
		return
	}

	r.logger.Info(ctx, "intake poll finished",
		slog.Int("created", result.Created),
		slog.Int("skipped", result.Skipped),
		slog.Int("failed", result.Failed),
		slog.Int("unchanged", result.Unchanged),
	)
}
