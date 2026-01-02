package main

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/resources"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoutesConfig configures HTTP routes and holds long-lived resources
// such as the database pool and environment used by handlers.
type RoutesConfig struct {
	router *chi.Mux
	dbPool *pgxpool.Pool
}

// Setup initializes the router, registers middleware, connects to the
// database, and mounts application routes. It returns an error on failure.
func (rc *RoutesConfig) Setup(ctx context.Context) error {
	rc.router = chi.NewMux()
	rc.addMiddleware()
	env := configs.LoadEnvironment()

	config := huma.DefaultConfig("Spenicle API", "1.0.0")
	config.Servers = []*huma.Server{
		{URL: "http://localhost:" + env.AppPort, Description: "Development server"},
	}
	// exclude the default "$schema" property from all responses
	config.CreateHooks = []func(huma.Config) huma.Config{}

	humaApi := humachi.New(rc.router, config)

	pool, err := (&configs.Database{}).Connect(ctx, env.DatabaseURL)
	if err != nil {
		logger.Log().Info("failed to connect to database", "error", err)
		return errors.New("failed to connect to database")
	}

	rc.dbPool = pool

	// Initialize repositories, services, and resources
	accountService := services.NewAccountService(repositories.NewAccountRepository(pool))
	resources.NewAccountResource(accountService).RegisterRoutes(humaApi)

	return nil
}

// addMiddleware registers common middlewares used by the router.
func (rc *RoutesConfig) addMiddleware() {
	rc.router.Use(middleware.Recoverer)
	rc.router.Use(middleware.RequestID)
	rc.router.Use(middleware.RealIP)
	rc.router.Use(middleware.Logger)
	rc.router.Use(middleware.Heartbeat("/health"))
}

// Run starts the HTTP server on the given port and returns the server
// instance so the caller can manage its lifecycle (shutdown, etc.).
func (rc *RoutesConfig) Run() *http.Server {
	env := configs.LoadEnvironment()

	srv := &http.Server{
		Addr:    ":" + env.AppPort,
		Handler: rc.router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log().Error("failed to start server", "error", err)
		}
	}()

	logger.Log().Info("Server is running on " + env.AppPort)
	return srv
}

// Close releases long-lived resources held by RoutesConfig (for now the
// database pool). Close is safe to call multiple times.
func (rc *RoutesConfig) Close() {
	if rc.dbPool != nil {
		rc.dbPool.Close()
	}
}
