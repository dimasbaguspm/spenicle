package workers

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/common"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	transactionTemplatesProcessed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_transaction_templates_processed_total",
			Help: "Total number of transaction templates processed successfully",
		},
	)

	transactionTemplatesFailed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "worker_transaction_templates_failed_total",
			Help: "Total number of transaction templates that failed processing",
		},
	)

	transactionWorkerLastRun = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "worker_transaction_templates_last_run_timestamp",
			Help: "Timestamp of the last transaction template worker run",
		},
	)
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
	logger := common.NewLogger("worker", "TransactionTemplateWorker")
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
	runID := common.GenerateID()
	logger := common.NewLogger("worker", "TransactionTemplateWorker", "run_id", runID, "task", "processTemplates")
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
			transactionTemplatesFailed.Inc()
			continue
		}

		templateLogger.Info("template processed successfully")
	}

	logger.Info("completed", "processed_count", len(dueTemplates))
	transactionTemplatesProcessed.Add(float64(len(dueTemplates)))
	transactionWorkerLastRun.Set(float64(time.Now().Unix()))
	return nil
}

func (ttw *TransactionTemplateWorker) processTemplate(ctx context.Context, template models.TransactionTemplateModel) error {
	logger := common.NewLogger("worker", "TransactionTemplateWorker", "template_id", template.ID)
	logger.Info("start processing", "template_name", template.Name, "type", template.Type, "amount", template.Amount)

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
	}

	logger.Info("success", "transaction_id", transaction.ID)

	return nil
}

func (ttw *TransactionTemplateWorker) Stop() {
	logger := common.NewLogger("worker", "TransactionTemplateWorker")
	logger.Info("stopping")
	ttw.cronWorker.Stop()
}
