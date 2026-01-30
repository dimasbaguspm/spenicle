package internal

import (
	"context"
	"log/slog"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/resources"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/dimasbaguspm/spenicle-api/internal/workers"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterPublicRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
	rpts := repositories.NewRootRepository(ctx, pool)
	sevs := services.NewRootService(rpts)

	resources.NewAuthResource(sevs.Ath).Routes(huma)
}

func RegisterPrivateRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
	huma.UseMiddleware(middleware.SessionMiddleware(huma))

	rpts := repositories.NewRootRepository(ctx, pool)
	sevs := services.NewRootService(rpts)

	resources.NewAccountResource(sevs).Routes(huma)
	resources.NewCategoryResource(sevs).Routes(huma)
	resources.NewTransactionResource(sevs).Routes(huma)
	resources.NewSummaryResource(sevs).Routes(huma)
	resources.NewBudgetResource(sevs).Routes(huma)
	resources.NewBudgetTemplateResource(sevs).Routes(huma)
	resources.NewTagResource(sevs).Routes(huma)
}

func RegisterWorkers(ctx context.Context, pool *pgxpool.Pool) func() {
	rpts := repositories.NewRootRepository(ctx, pool)
	sevs := services.NewRootService(rpts)

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
