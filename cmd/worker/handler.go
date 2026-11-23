package workercmd

import (
	"context"
	"log/slog"

	"github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
)

func Serve(ctx context.Context, process *config.Process) {
	store := process.Store

	runner := handlers.New(
		store, store, process.Ledger, store, store, process.Artifacts,
		process.Cfg.ArtifactRetention,
		exports.New(store, store, store, process.Artifacts, process.Cfg.ExportRetention, clock.System{}),
		export.Deps{
			Ledger:        store,
			Exporter:      store,
			CustomQueries: store,
			Rates:         store,
			System:        store,
			Clock:         clock.System{},
			BaseCurrency:  process.BaseCurrency,
		},
		process.Cfg.ExportStaleAfter,
		clock.System{}, process.Logger,
	)

	process.Logger.InfoContext(ctx, "recurring worker started",
		slog.Duration("every", process.Cfg.WorkerInterval),
		slog.Duration("artifact_retention", process.Cfg.ArtifactRetention),
		slog.Duration("export_retention", process.Cfg.ExportRetention))

	runner.Serve(ctx, process.Cfg.WorkerInterval)
}
