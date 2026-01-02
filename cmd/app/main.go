package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	setupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	env := configs.LoadEnvironment()

	if err := env.Validate(); err != nil {
		logger.Log().Error("environment configuration validation failed", "error", err)
		panic(err)
	}

	// Run database migrations
	logger.Log().Info("Running database migrations...")
	migration := configs.New(env.DatabaseURL)
	if err := migration.Up(); err != nil {
		logger.Log().Error("failed to run migrations", "error", err)
		panic(err)
	}
	logger.Log().Info("Database migrations completed successfully")

	routes := &internal.RoutesConfig{}
	if err := routes.Setup(setupCtx, env); err != nil {
		logger.Log().Error("failed to set up routes", "error", err)
		panic(err)
	}

	srv := routes.Run()

	// Start background worker
	worker := routes.GetWorker()
	if worker != nil {
		worker.Start(ctx)
		logger.Log().Info("Worker started")
	}

	// clean up on shutdown
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Log().Error("failed to shut down server", "error", err)
	}
	routes.Close()
}
