package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
)

// BudgetTemplateStore defines the interface for budget template operations
type BudgetTemplateStore interface {
	GetActiveTemplates(ctx context.Context) ([]schemas.BudgetTemplateSchema, error)
}

// BudgetStore defines the interface for budget operations
type BudgetStore interface {
	CheckDuplicate(ctx context.Context, templateID *int, accountID *int, categoryID *int, periodStart time.Time, periodEnd time.Time) (bool, error)
	Create(ctx context.Context, input schemas.CreateBudgetSchema) (*schemas.BudgetSchema, error)
}

// BudgetGenerationJob handles automatic budget creation from templates
type BudgetGenerationJob struct {
	templateRepo BudgetTemplateStore
	budgetRepo   BudgetStore
}

// NewBudgetGenerationJob creates a new budget generation job
func NewBudgetGenerationJob(templateRepo BudgetTemplateStore, budgetRepo BudgetStore) *BudgetGenerationJob {
	return &BudgetGenerationJob{
		templateRepo: templateRepo,
		budgetRepo:   budgetRepo,
	}
}

// Name returns the job identifier
func (j *BudgetGenerationJob) Name() string {
	return "budget_generation"
}

// Schedule returns when this job should run (daily at midnight)
func (j *BudgetGenerationJob) Schedule() string {
	return "00:00"
}

// Run executes the budget generation logic
func (j *BudgetGenerationJob) Run(ctx context.Context) error {
	logger.Log().Info("Starting budget generation from templates")

	// Get all active templates
	templates, err := j.templateRepo.GetActiveTemplates(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch active templates: %w", err)
	}

	if len(templates) == 0 {
		logger.Log().Info("No active templates found")
		return nil
	}

	logger.Log().Info("Processing templates", "count", len(templates))

	successCount := 0
	skipCount := 0
	errorCount := 0

	for _, template := range templates {
		if err := j.processTemplate(ctx, template); err != nil {
			logger.Log().Error("Failed to process template",
				"template_id", template.ID,
				"error", err,
			)
			errorCount++
		} else {
			successCount++
		}
	}

	logger.Log().Info("Budget generation completed",
		"success", successCount,
		"skipped", skipCount,
		"errors", errorCount,
	)

	return nil
}

// processTemplate generates budgets for a single template
func (j *BudgetGenerationJob) processTemplate(ctx context.Context, template schemas.BudgetTemplateSchema) error {
	now := time.Now()

	// Calculate the next period based on recurrence
	periodStart, periodEnd := j.calculateNextPeriod(template, now)

	// Check if template is still active
	if template.EndDate != nil && periodStart.After(*template.EndDate) {
		logger.Log().Debug("Template expired, skipping",
			"template_id", template.ID,
			"end_date", template.EndDate,
		)
		return nil
	}

	// Check if budget already exists for this period
	templateIDInt := int(template.ID)

	var accountIDInt *int
	if template.AccountID != nil {
		val := int(*template.AccountID)
		accountIDInt = &val
	}

	var categoryIDInt *int
	if template.CategoryID != nil {
		val := int(*template.CategoryID)
		categoryIDInt = &val
	}

	exists, err := j.budgetRepo.CheckDuplicate(
		ctx,
		&templateIDInt,
		accountIDInt,
		categoryIDInt,
		periodStart,
		periodEnd,
	)
	if err != nil {
		return fmt.Errorf("failed to check duplicate: %w", err)
	}

	if exists {
		logger.Log().Debug("Budget already exists for period, skipping",
			"template_id", template.ID,
			"period_start", periodStart,
			"period_end", periodEnd,
		)
		return nil
	}

	// Create the budget
	templateID := template.ID
	createInput := schemas.CreateBudgetSchema{
		TemplateID:  &templateID,
		AccountID:   template.AccountID,
		CategoryID:  template.CategoryID,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		AmountLimit: template.AmountLimit,
		Note:        template.Note,
	}

	budget, err := j.budgetRepo.Create(ctx, createInput)
	if err != nil {
		return fmt.Errorf("failed to create budget: %w", err)
	}

	logger.Log().Info("Created budget from template",
		"budget_id", budget.ID,
		"template_id", template.ID,
		"period_start", periodStart,
		"period_end", periodEnd,
		"amount_limit", template.AmountLimit,
	)

	return nil
}

// calculateNextPeriod determines the next budget period based on template recurrence
func (j *BudgetGenerationJob) calculateNextPeriod(template schemas.BudgetTemplateSchema, now time.Time) (time.Time, time.Time) {
	var periodStart, periodEnd time.Time

	switch template.Recurrence {
	case "weekly":
		// Find the start of current week (Monday)
		weekday := now.Weekday()
		daysFromMonday := int(weekday - time.Monday)
		if weekday == time.Sunday {
			daysFromMonday = 6
		}
		periodStart = now.AddDate(0, 0, -daysFromMonday).Truncate(24 * time.Hour)

		// If we're already past the start of this week, move to next week
		if now.After(periodStart.Add(24 * time.Hour)) {
			periodStart = periodStart.AddDate(0, 0, 7)
		}

		periodEnd = periodStart.AddDate(0, 0, 6).Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	case "monthly":
		// Use template start date's day, or day 1 if not set
		dayOfMonth := template.StartDate.Day()

		// Start with current month
		year, month := now.Year(), now.Month()
		periodStart = time.Date(year, month, dayOfMonth, 0, 0, 0, 0, now.Location())

		// If we're past this date in the current month, move to next month
		if now.After(periodStart) {
			if month == time.December {
				year++
				month = time.January
			} else {
				month++
			}
			periodStart = time.Date(year, month, dayOfMonth, 0, 0, 0, 0, now.Location())
		}

		// Handle months with fewer days (e.g., Feb 30 -> Feb 28/29)
		if periodStart.Month() != month {
			// If date doesn't exist in target month, use last day of previous month
			periodStart = time.Date(year, month+1, 0, 0, 0, 0, 0, now.Location())
		}

		// End is last moment of the month
		nextMonth := periodStart.AddDate(0, 1, 0)
		periodEnd = nextMonth.Add(-time.Second)

	case "yearly":
		// Use template start date's month and day
		monthOfYear := template.StartDate.Month()
		dayOfMonth := template.StartDate.Day()

		year := now.Year()
		periodStart = time.Date(year, monthOfYear, dayOfMonth, 0, 0, 0, 0, now.Location())

		// If we're past this date this year, move to next year
		if now.After(periodStart) {
			year++
			periodStart = time.Date(year, monthOfYear, dayOfMonth, 0, 0, 0, 0, now.Location())
		}

		periodEnd = periodStart.AddDate(1, 0, 0).Add(-time.Second)

	default:
		// For "none" or unknown, create a one-time budget for current month
		year, month := now.Year(), now.Month()
		periodStart = time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
		periodEnd = periodStart.AddDate(0, 1, 0).Add(-time.Second)
	}

	return periodStart, periodEnd
}
