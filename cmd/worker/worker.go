// Package workercmd is the worker process: it posts the due recurring rules and
// opens no port.
//
// This file is the command the root binary mounts; it is also what the hidden
// "all" command starts alongside the API.
package workercmd

import (
	"context"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/worker"
)

func Command() *cobra.Command {
	return &cobra.Command{
		Use:   "worker",
		Short: "Post the due recurring rules; ignores ADDR",
		Args:  cobra.NoArgs,
		RunE:  run,
	}
}

func run(cmd *cobra.Command, _ []string) error {
	ctx := cmd.Context()

	process, err := config.Start(ctx, config.ServiceNameWorker)
	if err != nil {
		return err
	}

	defer process.Close(ctx)

	Serve(ctx, process)

	return nil
}

func Serve(ctx context.Context, process *config.Process) {
	runner := worker.New(process.Store, process.Store, process.Ledger, clock.System{}, process.Logger)

	process.Logger.InfoContext(ctx, "recurring worker started",
		slog.Duration("every", process.Cfg.WorkerInterval))

	runner.Serve(ctx, process.Cfg.WorkerInterval)
}
