package workers

import (
	"context"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/constants"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/redis/go-redis/v9"
)

type TransactionTemplateWorker struct {
	cronWorker         *common.CronWorker
	templateRepo       repositories.TransactionTemplateRepository
	transactionService services.TransactionService
	rdb                *redis.Client
}

func NewTransactionTemplateWorker(
	ctx context.Context,
	templateRepo repositories.TransactionTemplateRepository,
	transactionService services.TransactionService,
	rdb *redis.Client,
) *TransactionTemplateWorker {
	return &TransactionTemplateWorker{
		cronWorker:         common.NewCronWorker(ctx),
		templateRepo:       templateRepo,
		transactionService: transactionService,
		rdb:                rdb,
	}
}

func (ttw *TransactionTemplateWorker) Start() error {
	logger := observability.NewLogger("worker", "TransactionTemplateWorker")
	logger.Info("starting")

	err := ttw.cronWorker.Register(common.CronTask{
		ID:       "process-transaction-templates",
		Name:     "Process Transaction Templates",
		Schedule: 1 * time.Hour,
		Handler:  ttw.processTemplates,
	})

	if err != nil {
		logger.Error("failed to start", "error", err)
	}
	return nil
}

func (ttw *TransactionTemplateWorker) processTemplates(ctx context.Context) error {
	runID := observability.GenerateID()
	logger := observability.NewLogger("worker", "TransactionTemplateWorker", "run_id", runID, "task", "processTemplates")
	logger.Info("start")

	dueTemplates, err := ttw.templateRepo.GetDueTemplates(ctx)
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

		if err := ttw.processTemplate(ctx, template); err != nil {
			templateLogger.Error("failed to process template", "error", err, "template_name", template.Name)
			observability.TransactionTemplatesFailed.Inc()
			continue
		}

		templateLogger.Info("template processed successfully")
	}

	logger.Info("completed", "processed_count", len(dueTemplates))
	observability.TransactionTemplatesProcessed.Add(float64(len(dueTemplates)))
	observability.TransactionWorkerRuns.Inc()
	return nil
}

func (ttw *TransactionTemplateWorker) processTemplate(ctx context.Context, template models.TransactionTemplateModel) error {
	logger := observability.NewLogger("worker", "TransactionTemplateWorker", "template_id", template.ID)
	logger.Info("start processing", "template_name", template.Name, "type", template.Type, "amount", template.Amount)

	var destAccountID *int64
	if template.DestinationAccount != nil {
		destAccountID = &template.DestinationAccount.ID
	}

	// Build note with template name and occurrence count
	nextOccurrence := template.RecurringStats.Occurrences + 1
	noteStr := fmt.Sprintf("%s (Occurrence %d", template.Name, nextOccurrence)

	if template.RecurringStats.Remaining != nil {
		totalOccurrences := nextOccurrence + *template.RecurringStats.Remaining - 1
		noteStr = fmt.Sprintf("%s of %d", noteStr, totalOccurrences)
	}
	noteStr = noteStr + ")"

	if template.Note != nil && *template.Note != "" {
		noteStr = noteStr + " - " + *template.Note
	}

	var note *string = &noteStr

	transactionRequest := models.CreateTransactionModel{
		Type:                 template.Type,
		Date:                 time.Now().Truncate(24 * time.Hour),
		Amount:               template.Amount,
		CurrencyCode:         template.CurrencyCode,
		AccountID:            template.Account.ID,
		CategoryID:           template.Category.ID,
		DestinationAccountID: destAccountID,
		Note:                 note,
	}

	transaction, err := ttw.transactionService.Create(ctx, transactionRequest)
	if err != nil {
		logger.Error("failed to create transaction", "error", err)
		return err
	}

	logger.Info("transaction created", "transaction_id", transaction.ID)

	if err := ttw.templateRepo.CreateRelation(ctx, transaction.ID, template.ID); err != nil {
		logger.Error("failed to create relation", "error", err, "transaction_id", transaction.ID)
	}

	if err := ttw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
		logger.Error("failed to update execution time", "error", err)
		return err
	}

	// Invalidate template caches after updating
	if err := common.InvalidateCacheForEntity(ctx, ttw.rdb, constants.EntityTransactionTemplate, map[string]interface{}{"templateId": template.ID}); err != nil {
		logger.Warn("failed to invalidate template cache", "error", err)
	}
	// Invalidate transaction and related caches since transaction was created
	if err := common.InvalidateCacheForEntity(ctx, ttw.rdb, constants.EntityTransaction, map[string]interface{}{}); err != nil {
		logger.Warn("failed to invalidate transaction cache", "error", err)
	}

	logger.Info("success", "transaction_id", transaction.ID)

	return nil
}

func (ttw *TransactionTemplateWorker) Stop() {
	logger := observability.NewLogger("worker", "TransactionTemplateWorker")
	logger.Info("stopping")
	ttw.cronWorker.Stop()
}
