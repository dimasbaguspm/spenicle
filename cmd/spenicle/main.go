// Command spenicle is the whole product: one binary, one file, one port.
//
// The first argument picks what the process serves: "http" the API, "worker"
// only the recurring rules, "all" (the default) both.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/dimasbaguspm/spenicle/internal/app"
)

const usage = `usage: spenicle [http|worker|all]

  http    serve the API only
  worker  post the due recurring rules only
  all     serve the API and the recurring rules in one process (default)`

func main() {
	mode, err := parseMode(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(2)
	}

	if runErr := run(mode); runErr != nil {
		fmt.Fprintf(os.Stderr, "spenicle: %v\n", runErr)
		os.Exit(1)
	}
}

func run(mode string) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	return app.Run(ctx, mode)
}

func parseMode(args []string) (string, error) {
	if len(args) == 0 {
		return app.ModeAll, nil
	}

	switch args[0] {
	case app.ModeHTTP, app.ModeWorker, app.ModeAll:
		return args[0], nil
	default:
		return "", fmt.Errorf("unknown mode %q", args[0])
	}
}
