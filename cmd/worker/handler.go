package workercmd

import (
	"context"
	"log/slog"
	"path/filepath"

	"github.com/dimasbaguspm/spenicle/cmd/worker/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	gmailmail "github.com/dimasbaguspm/spenicle/internal/repository/mailbox/gmail"
	"github.com/dimasbaguspm/spenicle/internal/repository/oauth/google"
)

func Serve(ctx context.Context, process *config.Process) {
	store := process.Store

	parts, err := filestore.NewParts(filepath.Join(process.Cfg.DataDir, config.DefaultImportDirName))
	if err != nil {
		process.Logger.Error(ctx, "import parts directory", slog.Any("error", err))

		return
	}

	runner := handlers.New(
		store, store, captures.NewQueue(store, process.Sealer, clock.System{}),
		store, store, process.Artifacts, process.Exports, parts,
		process.Cfg.ArtifactRetention,
		exports.New(store, store, store, process.Exports, process.Cfg.ExportRetention, clock.System{}),
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
		process.Cfg.ExportDir,
		clock.Zoned{Loc: process.Location}, process.Location, process.Logger,
	)

	connector := connections.New(store, store, process.Sealer, google.New(nil, "", "", ""),
		clock.System{})

	extractor, err := config.SelectRail(ctx, process.Cfg, process.Logger)
	if err != nil {
		process.Logger.Error(ctx, "extraction rail", slog.Any("error", err))

		return
	}

	captured := captures.New(store, process.Ledger, process.Sealer, process.Artifacts, store,
		extractor, store, clock.System{}, clock.System{})

	runner.Intake = intake.New(store, captured, store, process.Sealer,
		gmailmail.New(nil, "", connector))

	process.Logger.Info(ctx, "recurring worker started",
		slog.Duration("every", process.Cfg.WorkerInterval),
		slog.Duration("artifact_retention", process.Cfg.ArtifactRetention),
		slog.Duration("export_retention", process.Cfg.ExportRetention),
		slog.String("timezone", process.Location.String()))

	runner.Serve(ctx, process.Cfg.WorkerInterval)
}
