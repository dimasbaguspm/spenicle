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

type TransactionTemplateWorker struct {
	cronWorker         *common.CronWorker
	templateRepo       repositories.TransactionTemplateRepository
	transactionService services.TransactionService
}

func NewTransactionTemplateWorker(
	ctx context.Context,
	templateRepo repositories.TransactionTemplateRepository,
	transactionService services.TransactionService,
) *TransactionTemplateWorker {
	return &TransactionTemplateWorker{
		cronWorker:         common.NewCronWorker(ctx),
		templateRepo:       templateRepo,
		transactionService: transactionService,
	}
}

func (ttw *TransactionTemplateWorker) Start() error {
	slog.Info("Starting transaction template worker")

	err := ttw.cronWorker.Register(common.CronTask{
		ID:       "process-transaction-templates",
		Name:     "Process Transaction Templates",
		Schedule: 1 * time.Hour,
		Handler:  ttw.processTemplates,
	})

	if err != nil {
		slog.Error("Failed to start transaction template worker", "err", err)
	}
	return nil
}

func (ttw *TransactionTemplateWorker) processTemplates(ctx context.Context) error {
	slog.Debug("Processing transaction templates")

	dueTemplates, err := ttw.templateRepo.GetDueTemplates(ctx)
	if err != nil {
		slog.Error("Failed to get due templates", "err", err)
		return err
	}

	if len(dueTemplates) == 0 {
		slog.Debug("No templates due for processing")
		return nil
	}

	slog.Info("Processing templates", "count", len(dueTemplates))

	for _, template := range dueTemplates {
		if err := ttw.processTemplate(ctx, template); err != nil {
			slog.Error(
				"Failed to process template",
				"templateID", template.ID,
				"templateName", template.Name,
				"err", err,
			)
			continue
		}

		if err := ttw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
			slog.Error(
				"Failed to update template execution time",
				"templateID", template.ID,
				"err", err,
			)
		}
	}

	return nil
}

func (ttw *TransactionTemplateWorker) processTemplate(ctx context.Context, template models.TransactionTemplateModel) error {
	slog.Debug(
		"Processing individual template",
		"templateID", template.ID,
		"templateName", template.Name,
		"type", template.Type,
		"amount", template.Amount,
	)

	var destAccountID *int64
	if template.DestinationAccount != nil {
		destAccountID = &template.DestinationAccount.ID
	}

	transactionRequest := models.CreateTransactionModel{
		Type:                 template.Type,
		Date:                 time.Now().Truncate(24 * time.Hour),
		Amount:               template.Amount,
		AccountID:            template.Account.ID,
		CategoryID:           template.Category.ID,
		DestinationAccountID: destAccountID,
		Note:                 template.Note,
	}

	_, err := ttw.transactionService.Create(ctx, transactionRequest)
	if err != nil {
		return err
	}

	slog.Info(
		"Successfully created transaction from template",
		"templateID", template.ID,
		"templateName", template.Name,
	)

	return nil
}

func (ttw *TransactionTemplateWorker) Stop() {
	slog.Info("Stopping transaction template worker")
	ttw.cronWorker.Stop()
}
