package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/dimasbaguspm/spenicle-api/config"
	"github.com/dimasbaguspm/spenicle-api/internal/database"
	"github.com/dimasbaguspm/spenicle-api/internal/database/repositories"
	"github.com/dimasbaguspm/spenicle-api/resource"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoutesConfig configures HTTP routes and holds long-lived resources
// such as the database pool and environment used by handlers.
type RoutesConfig struct {
	router      *chi.Mux
	humaAPI     huma.API
	dbPool      *pgxpool.Pool
	Environment *config.Environment
}

// Setup initializes the router, registers middleware, connects to the
// database, and mounts application routes. It returns an error on failure.
func (rc *RoutesConfig) Setup(ctx context.Context) error {
	rc.router = chi.NewRouter()
	rc.addMiddleware()

	// Create Huma API with Chi adapter
	config := huma.DefaultConfig("Spenicle API", "1.0.0")
	config.Servers = []*huma.Server{
		{URL: "http://localhost:3000", Description: "Development server"},
	}
	// exclude the default "$schema" property from all responses
	config.CreateHooks = []func(huma.Config) huma.Config{}

	// register Chi adapter
	rc.humaAPI = humachi.New(rc.router, config)

	// Connect to the database
	db := &database.Database{Env: rc.Environment}
	pool, err := db.Connect(ctx)

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// assign the pool to the struct
	rc.dbPool = pool

	// Initialize repositories and resources
	accountResource := resource.NewAccountResource(repositories.NewAccountRepository(pool))
	accountResource.RegisterRoutes(rc.humaAPI)

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
func (rc *RoutesConfig) Run(port string) *http.Server {
	srv := &http.Server{
		Addr:    port,
		Handler: rc.router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("server error: %v", err)
		}
	}()

	return srv
}

// Close releases long-lived resources held by RoutesConfig (for now the
// database pool). Close is safe to call multiple times.
func (rc *RoutesConfig) Close() {
	if rc.dbPool != nil {
		rc.dbPool.Close()
	}
}
