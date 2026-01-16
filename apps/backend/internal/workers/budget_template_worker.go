package workers

import (
	"context"
	"log/slog"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type BudgetTemplateWorker struct {
	cronWorker    *common.CronWorker
	templateRepo  repositories.BudgetTemplateRepository
	budgetService services.BudgetService
}

func NewBudgetTemplateWorker(
	ctx context.Context,
	templateRepo repositories.BudgetTemplateRepository,
	budgetService services.BudgetService,
) *BudgetTemplateWorker {
	return &BudgetTemplateWorker{
		cronWorker:    common.NewCronWorker(ctx),
		templateRepo:  templateRepo,
		budgetService: budgetService,
	}
}

func (btw *BudgetTemplateWorker) Start() error {
	slog.Info("Starting budget template worker")

	err := btw.cronWorker.Register(common.CronTask{
		ID:       "process-budget-templates",
		Name:     "Process Budget Templates",
		Schedule: 1 * time.Hour, // Run every hour
		Handler:  btw.processTemplates,
	})

	if err != nil {
		slog.Error("Failed to start budget template worker", "err", err)
	}
	return nil
}

func (btw *BudgetTemplateWorker) processTemplates(ctx context.Context) error {
	slog.Debug("Processing budget templates")

	dueTemplates, err := btw.templateRepo.GetDueTemplates(ctx)
	if err != nil {
		slog.Error("Failed to get due budget templates", "err", err)
		return err
	}

	if len(dueTemplates) == 0 {
		slog.Debug("No budget templates due for processing")
		return nil
	}

	slog.Info("Processing budget templates", "count", len(dueTemplates))

	for _, template := range dueTemplates {
		if err := btw.processTemplate(ctx, template); err != nil {
			slog.Error(
				"Failed to process budget template",
				"templateID", template.ID,
				"err", err,
			)
			continue
		}

		// Update last_executed_at timestamp
		if err := btw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
			slog.Error(
				"Failed to update budget template execution time",
				"templateID", template.ID,
				"err", err,
			)
		}
	}

	return nil
}

func (btw *BudgetTemplateWorker) processTemplate(ctx context.Context, template models.BudgetTemplateModel) error {
	slog.Debug(
		"Processing individual budget template",
		"templateID", template.ID,
		"amountLimit", template.AmountLimit,
		"recurrence", template.Recurrence,
	)

	periodStart, periodEnd := calculateBudgetPeriod(template.Recurrence)

	budgetRequest := models.CreateBudgetModel{
		TemplateID:  &template.ID,
		AccountID:   template.AccountID,
		CategoryID:  template.CategoryID,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		AmountLimit: template.AmountLimit,
		Note:        template.Note,
	}

	_, err := btw.budgetService.Create(ctx, budgetRequest)
	if err != nil {
		return err
	}

	slog.Info(
		"Successfully created budget from template",
		"templateID", template.ID,
	)

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
	slog.Info("Stopping budget template worker")
	btw.cronWorker.Stop()
}
