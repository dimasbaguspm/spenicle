package internal

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	internalmiddleware "github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/tracing"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/resources"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/dimasbaguspm/spenicle-api/internal/worker"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoutesConfig configures HTTP routes and holds long-lived resources
// such as the database pool and environment used by handlers.
type RoutesConfig struct {
	router *chi.Mux
	dbPool *pgxpool.Pool
	worker *worker.Worker
}

// Setup initializes the router, registers middleware, connects to the
// database, and mounts application routes. It returns an error on failure.
func (rc *RoutesConfig) Setup(ctx context.Context, env *configs.Environment) error {
	rc.router = chi.NewMux()
	rc.addMiddleware()

	config := huma.DefaultConfig("Spenicle API", "1.0.0")
	config.Servers = []*huma.Server{{URL: "http://localhost:" + env.AppPort, Description: "Development server"}}
	// exclude the default "$schema" property from all responses
	config.CreateHooks = []func(huma.Config) huma.Config{}

	// define security schemes at the top level for OpenAPI documentation
	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
	}

	publicApi := humachi.New(rc.router, config)

	pool, err := (&configs.Database{}).Connect(ctx, env.DatabaseURL)
	if err != nil {
		logger.Log().Info("failed to connect to database", "error", err)
		return err
	}

	rc.dbPool = pool

	// repositories
	accountRepo := repositories.NewAccountRepository(pool)
	categoryRepo := repositories.NewCategoryRepository(pool)
	transactionRepo := repositories.NewTransactionRepository(pool)
	summaryRepo := repositories.NewSummaryRepository(pool)
	transactionRelationRepo := repositories.NewTransactionRelationRepository(pool)
	budgetTemplateRepo := repositories.NewBudgetTemplateRepository(pool)
	budgetRepo := repositories.NewBudgetRepository(pool)

	// services
	accountService := services.NewAccountService(accountRepo)
	categoryService := services.NewCategoryService(categoryRepo)
	transactionService := services.NewTransactionService(transactionRepo, accountRepo, categoryRepo)
	summaryService := services.NewSummaryService(summaryRepo)
	transactionRelationService := services.NewTransactionRelationService(transactionRelationRepo, transactionRepo)
	budgetTemplateService := services.NewBudgetTemplateService(budgetTemplateRepo)
	budgetService := services.NewBudgetService(budgetRepo)

	// public routes
	resources.NewAuthResource(env).RegisterRoutes(publicApi)

	// protected routes with "/" path, each resources have their own subrouter
	rc.router.Route("/", func(r chi.Router) {
		r.Use(func(h http.Handler) http.Handler { return internalmiddleware.RequireAuth(env, h) })
		protectedApi := humachi.New(r, config)
		resources.NewAccountResource(accountService, budgetService).RegisterRoutes(protectedApi)
		resources.NewCategoryResource(categoryService, budgetService).RegisterRoutes(protectedApi)
		resources.NewTransactionResource(transactionService).RegisterRoutes(protectedApi)
		resources.NewSummaryResource(summaryService).RegisterRoutes(protectedApi)
		resources.NewTransactionRelationResource(transactionRelationService).RegisterRoutes(protectedApi)
		resources.NewBudgetResource(budgetService, budgetTemplateService).RegisterRoutes(protectedApi)
	})

	// Initialize worker
	rc.worker = worker.New()
	budgetGenerationJob := worker.NewBudgetGenerationJob(budgetTemplateRepo, budgetRepo)
	rc.worker.Register(budgetGenerationJob)

	return nil
}

// addMiddleware registers common middlewares used by the router.
func (rc *RoutesConfig) addMiddleware() {
	rc.router.Use(middleware.Recoverer)
	// ensure every request has a trace id (uses X-Request-Id if available)
	rc.router.Use(tracing.Middleware)
	rc.router.Use(middleware.Logger)
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
	if rc.worker != nil {
		rc.worker.Stop()
	}
	if rc.dbPool != nil {
		rc.dbPool.Close()
	}
}

// GetWorker returns the worker instance for external management
func (rc *RoutesConfig) GetWorker() *worker.Worker {
	return rc.worker
}
