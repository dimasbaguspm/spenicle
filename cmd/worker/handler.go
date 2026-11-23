package workercmd

import (
	"context"
	"log/slog"

	"github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
)

func Serve(ctx context.Context, process *config.Process) {
	runner := handlers.New(process.Store, process.Store, process.Ledger, clock.System{}, process.Logger)

	process.Logger.InfoContext(ctx, "recurring worker started",
		slog.Duration("every", process.Cfg.WorkerInterval))

	runner.Serve(ctx, process.Cfg.WorkerInterval)
}
