// Package workercmd is the worker process: it posts the due recurring rules and
// opens no port.
//
// This file is the command the root binary mounts; the wiring lives in handler.go
// and the run loop in handlers/.
package workercmd

import (
	"github.com/spf13/cobra"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

const serviceName = "spenicle-worker"

func Command() *cobra.Command {
	return &cobra.Command{
		Use:   "worker",
		Short: "Post the due recurring rules; opens no port",
		Args:  cobra.NoArgs,
		RunE:  run,
	}
}

func run(cmd *cobra.Command, _ []string) error {
	ctx := cmd.Context()

	telemetry.SetIdentity(serviceName, config.Version, telemetry.ComponentWorker)

	process, err := config.Start(ctx, serviceName)
	if err != nil {
		return err
	}

	defer process.Close(ctx)

	Serve(ctx, process)

	return nil
}
