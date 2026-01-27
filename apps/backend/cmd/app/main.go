package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/danielgtaylor/huma/v2/adapters/humago"
	"github.com/dimasbaguspm/spenicle-api/internal"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	svr := http.NewServeMux()
	env := configs.NewEnvironment()
	pool := configs.NewDatabase(ctx, env)

	humaSvr := humago.New(svr, configs.NewOpenApi(svr, env))

	internal.RegisterPublicRoutes(ctx, humaSvr, pool)
	internal.RegisterPrivateRoutes(ctx, humaSvr, pool)
	cleanup := internal.RegisterWorkers(ctx, pool)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", env.AppPort),
		Handler: middleware.CORS(svr),
	}

	slog.Info("Server is running at port", "port", env.AppPort)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "err", err)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down HTTP server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	defer cleanup()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Graceful shutdown failed, forcing exit", "err", err)
	} else {
		slog.Info("Server stopped")
	}
}
