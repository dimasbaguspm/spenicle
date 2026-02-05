package workers

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
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
		ID:       "process-budget-templates",
		Name:     "Process Budget Templates",
		Schedule: 1 * time.Hour, // Run every hour
		Handler:  btw.processTemplates,
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

		if err := btw.processTemplate(ctx, template); err != nil {
			templateLogger.Error("failed to process template", "error", err)
			observability.BudgetTemplatesFailed.Inc()
			continue
		}

		templateLogger.Info("template processed successfully")

		// Update last_executed_at timestamp
		if err := btw.budgetTemplateService.Rpts.BudgTem.UpdateLastExecuted(ctx, template.ID); err != nil {
			templateLogger.Error("failed to update execution time", "error", err)
			continue
		}

		// Invalidate template caches after updating
		cacheKey := fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d", template.ID)
		if err := common.InvalidateCache(ctx, btw.rdb, cacheKey); err != nil {
			templateLogger.Warn("failed to invalidate template cache", "error", err)
		}
		// Invalidate paged cache since remaining count has changed
		if err := common.InvalidateCache(ctx, btw.rdb, constants.BudgetTemplatesPagedCacheKeyPrefix+"*"); err != nil {
			templateLogger.Warn("failed to invalidate paged cache", "error", err)
		}
	}

	logger.Info("completed", "processed_count", len(dueTemplates))
	observability.BudgetTemplatesProcessed.Add(float64(len(dueTemplates)))
	observability.BudgetWorkerLastRun.Set(float64(time.Now().Unix()))

	// Invalidate all paged cache keys for budgets since we created new budgets
	if len(dueTemplates) > 0 {
		common.InvalidateCache(ctx, btw.rdb, constants.BudgetsPagedCacheKeyPrefix+"*")
		// Invalidate related budget list caches for each processed template
		for _, template := range dueTemplates {
			cacheKey := fmt.Sprintf(constants.BudgetTemplateCacheKeyPrefix+"%d_budgets_paged:*", template.ID)
			if err := common.InvalidateCache(ctx, btw.rdb, cacheKey); err != nil {
				logger.Warn("failed to invalidate related budgets cache", "template_id", template.ID, "error", err)
			}
		}
	}

	return nil
}

func (btw *BudgetTemplateWorker) processTemplate(ctx context.Context, template models.BudgetTemplateModel) error {
	logger := observability.NewLogger("worker", "BudgetTemplateWorker", "template_id", template.ID)
	logger.Info("start processing", "amount_limit", template.AmountLimit, "recurrence", template.Recurrence)

	periodStart, periodEnd := calculateBudgetPeriod(template.Recurrence)
	periodType := calculatePeriodType(periodStart, periodEnd)

	// For recurring templates, deactivate any existing active budgets for the same account/category/period type
	if template.Recurrence != "none" {
		if err := btw.budgetTemplateService.DeactivateExistingActiveBudgets(ctx, template.AccountID, template.CategoryID, periodType); err != nil {
			logger.Error("failed to deactivate existing budgets", "error", err, "account_id", template.AccountID, "category_id", template.CategoryID, "period_type", periodType)
			return err
		}
		logger.Info("deactivated existing budgets")
	}

	budgetRequest := models.CreateBudgetModel{
		TemplateID:  &template.ID,
		AccountID:   template.AccountID,
		CategoryID:  template.CategoryID,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		AmountLimit: template.AmountLimit,
		Name:        fmt.Sprintf("%s (%s)", template.Name, periodStart.Format("2006-01-02")),
		Note:        template.Note,
	}

	budget, err := btw.budgetTemplateService.CreateBudget(ctx, budgetRequest)
	if err != nil {
		logger.Error("failed to create budget", "error", err)
		return err
	}

	logger.Info("budget created", "budget_id", budget.ID)

	if err := btw.budgetTemplateService.Rpts.BudgTem.CreateRelation(ctx, budget.ID, template.ID); err != nil {
		logger.Error("failed to create relation", "error", err, "budget_id", budget.ID)
	}

	logger.Info("success", "budget_id", budget.ID, "period_type", periodType)

	return nil
}

func calculateBudgetPeriod(recurrence string) (time.Time, time.Time) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch recurrence {
	case "weekly":
		// Week starts on Monday, calculate days from Monday of current week
		daysFromMonday := int((today.Weekday() - time.Monday + 7) % 7)
		weekStart := today.AddDate(0, 0, -daysFromMonday)
		weekEnd := weekStart.AddDate(0, 0, 6)
		return weekStart, weekEnd

	case "monthly":
		// Month starts on the 1st
		monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())
		monthEnd := monthStart.AddDate(0, 1, -1)
		return monthStart, monthEnd

	case "yearly":
		// Year starts on January 1st
		yearStart := time.Date(today.Year(), time.January, 1, 0, 0, 0, 0, today.Location())
		yearEnd := time.Date(today.Year(), time.December, 31, 0, 0, 0, 0, today.Location())
		return yearStart, yearEnd

	default:
		return today, today
	}
}

func (btw *BudgetTemplateWorker) Stop() {
	logger := observability.NewLogger("worker", "BudgetTemplateWorker")
	logger.Info("stopping")
	btw.cronWorker.Stop()
}

// calculatePeriodType determines the period type based on start and end dates
func calculatePeriodType(start, end time.Time) string {
	duration := end.Sub(start)
	days := int(duration.Hours()/24) + 1 // +1 to include both start and end dates

	// Check for weekly (7 days)
	if days == 7 {
		return "weekly"
	}

	// Check for monthly (28-31 days)
	if days >= 28 && days <= 31 {
		return "monthly"
	}

	// Check for yearly (365-366 days)
	if days >= 365 && days <= 366 {
		return "yearly"
	}

	return "custom"
}
