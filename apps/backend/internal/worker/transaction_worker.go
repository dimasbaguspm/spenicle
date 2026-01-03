package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
)

// TransactionTemplateStore defines the interface for transaction template operations
type TransactionTemplateStore interface {
	GetActiveTemplates(ctx context.Context) ([]schemas.TransactionTemplateSchema, error)
	IncrementInstallment(ctx context.Context, id int) error
}

// TransactionStore defines the interface for transaction operations
type TransactionStore interface {
	Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error)
}

// TransactionGenerationJob handles automatic transaction creation from templates
type TransactionGenerationJob struct {
	templateRepo    TransactionTemplateStore
	transactionRepo TransactionStore
}

// NewTransactionGenerationJob creates a new transaction generation job
func NewTransactionGenerationJob(templateRepo TransactionTemplateStore, transactionRepo TransactionStore) *TransactionGenerationJob {
	return &TransactionGenerationJob{
		templateRepo:    templateRepo,
		transactionRepo: transactionRepo,
	}
}

// Name returns the job identifier
func (j *TransactionGenerationJob) Name() string {
	return "transaction_generation"
}

// Schedule returns when this job should run (daily at midnight)
func (j *TransactionGenerationJob) Schedule() string {
	return "00:00"
}

// Run executes the transaction generation logic
func (j *TransactionGenerationJob) Run(ctx context.Context) error {
	logger.Log().Info("Starting transaction generation from templates")

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

	logger.Log().Info("Transaction generation completed",
		"success", successCount,
		"errors", errorCount,
	)

	return nil
}

// processTemplate generates a transaction for a single template
func (j *TransactionGenerationJob) processTemplate(ctx context.Context, template schemas.TransactionTemplateSchema) error {
	now := time.Now()

	// Check if it's time to generate this transaction
	if !j.shouldGenerateTransaction(template, now) {
		logger.Log().Debug("Not yet time to generate transaction",
			"template_id", template.ID,
			"next_date", j.calculateNextDate(template, now),
		)
		return nil
	}

	// Create the transaction
	note := ""
	if template.Note != nil {
		note = *template.Note
	}

	// Add installment info to note if applicable
	if template.InstallmentCount != nil {
		installmentInfo := fmt.Sprintf("Installment %d/%d",
			template.InstallmentCurrent+1,
			*template.InstallmentCount,
		)
		if note != "" {
			note = fmt.Sprintf("%s (%s)", note, installmentInfo)
		} else {
			note = installmentInfo
		}
	}

	accountID := int(template.AccountID)
	categoryID := int(template.CategoryID)
	nowPtr := now

	createInput := schemas.CreateTransactionSchema{
		AccountID:  accountID,
		CategoryID: categoryID,
		Type:       template.Type,
		Amount:     template.Amount,
		Date:       &nowPtr,
		Note:       &note,
	}

	transaction, err := j.transactionRepo.Create(ctx, createInput)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	logger.Log().Info("Created transaction from template",
		"transaction_id", transaction.ID,
		"template_id", template.ID,
		"amount", template.Amount,
		"type", template.Type,
	)

	// Increment installment counter if applicable
	if template.InstallmentCount != nil {
		if err := j.templateRepo.IncrementInstallment(ctx, int(template.ID)); err != nil {
			logger.Log().Error("Failed to increment installment counter",
				"template_id", template.ID,
				"error", err,
			)
			// Don't fail the whole process for this
		}
	}

	return nil
}

// shouldGenerateTransaction checks if a transaction should be generated today
func (j *TransactionGenerationJob) shouldGenerateTransaction(template schemas.TransactionTemplateSchema, now time.Time) bool {
	nextDate := j.calculateNextDate(template, now)

	// Check if today is on or after the next date
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	nextDateStart := time.Date(nextDate.Year(), nextDate.Month(), nextDate.Day(), 0, 0, 0, 0, now.Location())

	return !todayStart.Before(nextDateStart)
}

// calculateNextDate determines the next transaction date based on template recurrence
func (j *TransactionGenerationJob) calculateNextDate(template schemas.TransactionTemplateSchema, now time.Time) time.Time {
	// Use installment_current to calculate how many periods have passed
	periodsCompleted := template.InstallmentCurrent

	switch template.Recurrence {
	case "daily":
		return template.StartDate.AddDate(0, 0, periodsCompleted)

	case "weekly":
		return template.StartDate.AddDate(0, 0, periodsCompleted*7)

	case "monthly":
		return template.StartDate.AddDate(0, periodsCompleted, 0)

	case "yearly":
		return template.StartDate.AddDate(periodsCompleted, 0, 0)

	default:
		// For "none" or unknown, use start date
		return template.StartDate
	}
}
