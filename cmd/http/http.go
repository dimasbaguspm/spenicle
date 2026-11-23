// Package httpcmd is the API process: it composes the handler graph and serves it
// until the context is cancelled.
//
// This file is the command the root binary mounts; the handler graph, the route
// table and the server loop live in handler.go.
package httpcmd

import (
	"github.com/spf13/cobra"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
)

const serviceName = "spenicle-http"

func Command() *cobra.Command {
	return &cobra.Command{
		Use:   "http",
		Short: "Serve the API on ADDR",
		Args:  cobra.NoArgs,
		RunE:  run,
	}
}

func run(cmd *cobra.Command, _ []string) error {
	ctx := cmd.Context()

	process, err := config.Start(ctx, serviceName)
	if err != nil {
		return err
	}

	defer process.Close(ctx)

	handler, err := Handler(ctx, process)
	if err != nil {
		return err
	}

	return Serve(ctx, process, handler)
}
