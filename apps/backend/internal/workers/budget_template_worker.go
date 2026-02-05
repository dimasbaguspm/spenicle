package workers

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/redis/go-redis/v9"
)

type BudgetTemplateWorker struct {
	cronWorker            *common.CronWorker
	budgetTemplateService services.BudgetTemplateService
	rdb                   *redis.Client
}

func NewBudgetTemplateWorker(
	ctx context.Context,
	budgetTemplateService services.BudgetTemplateService,
	rdb *redis.Client,
) *BudgetTemplateWorker {
	return &BudgetTemplateWorker{
		cronWorker:            common.NewCronWorker(ctx),
		budgetTemplateService: budgetTemplateService,
		rdb:                   rdb,
	}
}

func (btw *BudgetTemplateWorker) Start() error {
	logger := observability.NewLogger("worker", "BudgetTemplateWorker")
	logger.Info("starting")

	err := btw.cronWorker.Register(common.CronTask{
		ID:             "process-budget-templates",
		Name:           "Process Budget Templates",
		Schedule:       15 * time.Minute,
		Handler:        btw.processTemplates,
		RunImmediately: true,
	})

	if err != nil {
		logger.Error("failed to start", "error", err)
	}
	return nil
}

func (btw *BudgetTemplateWorker) processTemplates(ctx context.Context) error {
	runID := observability.GenerateID()
	logger := observability.NewLogger("worker", "BudgetTemplateWorker", "run_id", runID, "task", "processTemplates")
	logger.Info("start")

	dueTemplates, err := btw.budgetTemplateService.Rpts.BudgTem.GetDueTemplates(ctx)
	if err != nil {
		logger.Error("failed to get due templates", "error", err)
		return err
	}

	if len(dueTemplates) == 0 {
		logger.Info("no templates due")
		return nil
	}

	logger.Info("processing templates", "count", len(dueTemplates))

	for _, template := range dueTemplates {
		templateLogger := logger.With("template_id", template.ID)
		templateLogger.Info("processing template")

		if _, err := btw.budgetTemplateService.GenerateBudgetFromTemplate(ctx, template); err != nil {
			templateLogger.Error("failed to process template", "error", err)
			observability.BudgetTemplatesFailed.Inc()
			continue
		}

		templateLogger.Info("template processed successfully")
	}

	logger.Info("completed", "processed_count", len(dueTemplates))
	observability.BudgetTemplatesProcessed.Add(float64(len(dueTemplates)))
	observability.BudgetWorkerLastRun.Set(float64(time.Now().Unix()))

	return nil
}

func (btw *BudgetTemplateWorker) Stop() {
	logger := observability.NewLogger("worker", "BudgetTemplateWorker")
	logger.Info("stopping")
	btw.cronWorker.Stop()
}
