package workercmd

import (
	"context"
	"log/slog"
	"path/filepath"

	"github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

func Serve(ctx context.Context, process *config.Process) {
	store := process.Store

	parts, err := filestore.NewParts(filepath.Join(process.Cfg.DataDir, config.DefaultImportDirName))
	if err != nil {
		process.Logger.Error(ctx, "import parts directory", slog.Any("error", err))

		return
	}

	runner := handlers.New(
		store, store, process.Ledger, store, store, process.Artifacts, parts,
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
		clock.Zoned{Loc: process.Location}, process.Location, process.Logger,
	)

	process.Logger.Info(ctx, "recurring worker started",
		slog.Duration("every", process.Cfg.WorkerInterval),
		slog.Duration("artifact_retention", process.Cfg.ArtifactRetention),
		slog.Duration("export_retention", process.Cfg.ExportRetention),
		slog.String("timezone", process.Location.String()))

	runner.Serve(ctx, process.Cfg.WorkerInterval)
}
