// Command spenicle is the whole product: one binary, one container, two
// supervised processes.
//
// "spenicle http" serves the API, "spenicle worker" posts the due recurring
// rules, and the hidden "spenicle all" runs both in one process for local
// development.
package main

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

func main() {
	os.Exit(run())
}

func run() int {
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

	process, err := config.Start(ctx, config.DefaultServiceName)
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
