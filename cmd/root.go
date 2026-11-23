// Package cmd is the command layer: the entry point the binary exposes and the
// commands it mounts. Each command lives next to the code it wires.
package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/spf13/cobra"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
	workercmd "github.com/dimasbaguspm/spenicle/cmd/worker"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
)

const allServiceName = "spenicle"

func Execute() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := root().ExecuteContext(ctx); err != nil {
		return 1
	}

	return 0
}

func root() *cobra.Command {
	command := &cobra.Command{
		Use:   "spenicle",
		Short: "Self-hosted, single-user expense tracker",
	}

	command.AddCommand(httpcmd.Command(), workercmd.Command(), allCommand())

	return command
}

func allCommand() *cobra.Command {
	return &cobra.Command{
		Use:    "all",
		Short:  "Run the API and the worker in one process (local development only)",
		Args:   cobra.NoArgs,
		Hidden: true,
		RunE:   runAll,
	}
}

func runAll(cmd *cobra.Command, _ []string) error {
	ctx := cmd.Context()

	process, err := config.Start(ctx, allServiceName)
	if err != nil {
		return err
	}

	defer process.Close(ctx)

	handler, err := httpcmd.Handler(ctx, process)
	if err != nil {
		return fmt.Errorf("api: %w", err)
	}

	var running sync.WaitGroup

	running.Add(1)

	go func() {
		defer running.Done()

		workercmd.Serve(ctx, process)
	}()

	listenErr := httpcmd.Serve(ctx, process, handler)

	running.Wait()

	return fmt.Errorf("listen: %w", listenErr)
}
