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

	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/config"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/handlers"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/middleware"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/scraper"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/storage"
	"github.com/dimasbaguspm/spenicle-snap-exchange/internal/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	env := config.NewEnvironment()

	store := storage.NewRateStore()
	ecbScraper := scraper.NewECBScraper(env.ECBURL)
	refreshWorker := worker.NewRefreshWorker(ctx, ecbScraper, store)

	refreshWorker.Start()

	handler := handlers.NewHandler(store)
	mux := handler.Routes()

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", env.AppPort),
		Handler: middleware.ObservabilityMiddleware(mux),
	}

	slog.Info("SnapExchange starting", "port", env.AppPort)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "err", err)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	refreshWorker.Stop()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Shutdown failed", "err", err)
	} else {
		slog.Info("Server stopped gracefully")
	}
}
