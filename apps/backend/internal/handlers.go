package internal

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/resources"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/dimasbaguspm/spenicle-api/internal/workers"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func RegisterPublicRoutes(ctx context.Context, svr *http.ServeMux, huma huma.API, db *pgxpool.Pool, rdb *redis.Client) {
	svr.Handle("/metrics", promhttp.Handler())
	svr.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	rpts := repositories.NewRootRepository(ctx, db)
	sevs := services.NewRootService(rpts, rdb)

	resources.NewAuthResource(sevs.Ath).Routes(huma)
}

func RegisterPrivateRoutes(ctx context.Context, huma huma.API, db *pgxpool.Pool, rdb *redis.Client) {
	huma.UseMiddleware(middleware.SessionMiddleware(huma))

	rpts := repositories.NewRootRepository(ctx, db)
	sevs := services.NewRootService(rpts, rdb)

	resources.NewAccountResource(sevs).Routes(huma)
	resources.NewCategoryResource(sevs).Routes(huma)
	resources.NewTransactionResource(sevs).Routes(huma)
	resources.NewSummaryResource(sevs).Routes(huma)
	resources.NewBudgetResource(sevs).Routes(huma)
	resources.NewBudgetTemplateResource(sevs).Routes(huma)
	resources.NewTagResource(sevs).Routes(huma)
}

func RegisterWorkers(ctx context.Context, db *pgxpool.Pool, rdb *redis.Client) func() {
	rpts := repositories.NewRootRepository(ctx, db)
	sevs := services.NewRootService(rpts, rdb)

	ttWorker := workers.NewTransactionTemplateWorker(ctx, rpts.TsctTem, sevs.Tsct)
	btWorker := workers.NewBudgetTemplateWorker(ctx, rpts.BudgTem, sevs.Budg)

	ttWorker.Start()
	btWorker.Start()

	return func() {
		slog.Info("Stopping all workers")
		ttWorker.Stop()
		btWorker.Stop()
	}
}
