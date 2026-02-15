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
	"github.com/dimasbaguspm/spenicle-api/clients"
	"github.com/dimasbaguspm/spenicle-api/internal"
	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	env := configs.NewEnvironment()
	db := configs.NewDatabase(ctx, env)
	rdb := configs.NewRedisClient(ctx, env)

	snapExchangeClient := clients.NewSnapExchangeClient("http://localhost:8081")
	if err := snapExchangeClient.HealthCheck(ctx); err != nil {
		slog.Warn("SnapExchange service unavailable on startup", "error", err)
	} else {
		slog.Info("SnapExchange service connected", "url", "http://localhost:8081")
	}

	rateLimitMgr := common.NewRateLimitManager(rdb)
	if err := rateLimitMgr.ClearAllRateLimitData(ctx); err != nil {
		slog.Warn("Failed to clear rate limit data on startup", "error", err)
	} else {
		slog.Info("Rate limit data cleared on startup")
	}

	svr := http.NewServeMux()

	humaSvr := humago.New(svr, configs.NewOpenApi(svr, env))

	internal.RegisterPublicRoutes(ctx, svr, humaSvr, db, rdb)
	internal.RegisterPrivateRoutes(ctx, humaSvr, db, rdb)
	cleanupWorkers := internal.RegisterWorkers(ctx, db, rdb)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", env.AppPort),
		Handler: middleware.RateLimitMiddleware(env, rateLimitMgr)(middleware.ObservabilityMiddleware(middleware.CORS(svr))),
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
	defer cleanupWorkers()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Graceful shutdown failed, forcing exit", "err", err)
	} else {
		slog.Info("Server stopped")
	}
}
