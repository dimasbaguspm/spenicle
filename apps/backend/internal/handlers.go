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

func RegisterMiddlewares(ctx context.Context, huma huma.API) {
	huma.UseMiddleware(middleware.CORS(huma))

}

func RegisterPublicRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
	ap := repositories.NewAuthRepository(ctx)
	as := services.NewAuthService(ap)

	resources.NewAuthResource(as).Routes(huma)
}

func RegisterPrivateRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
	huma.UseMiddleware(middleware.SessionMiddleware(huma))

	ar := repositories.NewAccountRepository(pool)
	cr := repositories.NewCategoryRepository(pool)
	tr := repositories.NewTransactionRepository(pool)
	sr := repositories.NewSummaryRepository(pool)
	br := repositories.NewBudgetRepository(pool)
	btr := repositories.NewBudgetTemplateRepository(pool)
	trr := repositories.NewTransactionRelationRepository(pool)
	tagr := repositories.NewTagRepository(pool)
	ttagr := repositories.NewTransactionTagRepository(pool)
	ttr := repositories.NewTransactionTemplateRepository(pool)

	as := services.NewAccountService(ar)
	cs := services.NewCategoryService(cr)
	ts := services.NewTransactionService(tr, ar)
	ss := services.NewSummaryService(sr)
	bs := services.NewBudgetService(br)
	bts := services.NewBudgetTemplateService(btr)
	trs := services.NewTransactionRelationService(trr, tr)
	tags := services.NewTagService(tagr)
	ttags := services.NewTransactionTagService(ttagr)
	tts := services.NewTransactionTemplateService(ttr)

	resources.NewAccountResource(as).Routes(huma)
	resources.NewCategoryResource(cs).Routes(huma)
	resources.NewTransactionResource(ts, trs, ttags, tts).Routes(huma)
	resources.NewSummaryResource(ss).Routes(huma)
	resources.NewBudgetResource(bs).Routes(huma)
	resources.NewBudgetTemplateResource(bts).Routes(huma)
	resources.NewTagResource(tags).Routes(huma)
}

func RegisterWorkers(ctx context.Context, pool *pgxpool.Pool) func() {
	ar := repositories.NewAccountRepository(pool)
	ttr := repositories.NewTransactionTemplateRepository(pool)
	tr := repositories.NewTransactionRepository(pool)
	br := repositories.NewBudgetRepository(pool)
	btr := repositories.NewBudgetTemplateRepository(pool)

	ts := services.NewTransactionService(tr, ar)
	bs := services.NewBudgetService(br)

	ttWorker := workers.NewTransactionTemplateWorker(ctx, ttr, ts)
	btWorker := workers.NewBudgetTemplateWorker(ctx, btr, bs)

	ttWorker.Start()
	btWorker.Start()

	return func() {
		slog.Info("Stopping all workers")
		ttWorker.Stop()
		btWorker.Stop()
	}
}
