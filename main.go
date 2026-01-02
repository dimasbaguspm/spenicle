package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	setupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	routes := &RoutesConfig{}
	if err := routes.Setup(setupCtx); err != nil {
		logger.Log().Error("failed to set up routes", "error", err)
	}

	srv := routes.Run()

	// clean up on shutdown
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Log().Error("failed to shut down server", "error", err)
	}
	routes.Close()
}
