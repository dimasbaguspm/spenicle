package resources

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type TransactionBulkResource struct {
	sevs services.RootService
}

func NewTransactionBulkResource(sevs services.RootService) TransactionBulkResource {
	return TransactionBulkResource{sevs: sevs}
}

func (tbr TransactionBulkResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "patch-transactions-bulk-draft",
		Method:      "PATCH",
		Path:        "/transactions/bulk/draft",
		Summary:     "Save bulk transaction updates as draft",
		Description: "Saves pending transaction updates to Redis as a draft/savepoint. One draft per user - overwrites existing draft. Expires after 24 hours.",
		Tags:        []string{"Transactions"},
	}, tbr.SaveDraft)

	huma.Register(api, huma.Operation{
		OperationID: "get-transactions-bulk-draft",
		Method:      "GET",
		Path:        "/transactions/bulk/draft",
		Summary:     "Retrieve bulk transaction draft",
		Description: "Retrieves saved draft from Redis to resume editing. One draft per user.",
		Tags:        []string{"Transactions"},
	}, tbr.GetDraft)

	huma.Register(api, huma.Operation{
		OperationID: "post-transactions-bulk-commit",
		Method:      "POST",
		Path:        "/transactions/bulk/draft/commit",
		Summary:     "Commit bulk transaction updates atomically",
		Description: "Applies all draft changes to database in a single transaction (all-or-nothing). Invalidates caches and deletes draft.",
		Tags:        []string{"Transactions"},
	}, tbr.CommitDraft)

	huma.Register(api, huma.Operation{
		OperationID: "delete-transactions-bulk-draft",
		Method:      "DELETE",
		Path:        "/transactions/bulk/draft",
		Summary:     "Delete draft without committing",
		Description: "Discards pending draft changes without applying them to database.",
		Tags:        []string{"Transactions"},
	}, tbr.DeleteDraft)
}

func (tbr TransactionBulkResource) SaveDraft(ctx context.Context, input *struct {
	Body models.BulkTransactionDraftModel
}) (*struct {
	Body models.BulkTransactionDraftResponseModel
}, error) {
	start := time.Now()
	defer func() {
		observability.RecordServiceOperation("transactions_bulk", "PATCH", time.Since(start).Seconds())
	}()

	resp, err := tbr.sevs.TsctBulk.SaveDraft(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.BulkTransactionDraftResponseModel
	}{Body: resp}, nil
}

func (tbr TransactionBulkResource) GetDraft(ctx context.Context, _ *struct{}) (*struct {
	Body     models.BulkTransactionDraftModel
	Metadata models.BulkTransactionDraftResponseModel
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions_bulk", "GET", time.Since(start).Seconds()) }()

	draft, metadata, err := tbr.sevs.TsctBulk.GetDraft(ctx)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body     models.BulkTransactionDraftModel
		Metadata models.BulkTransactionDraftResponseModel
	}{
		Body:     draft,
		Metadata: metadata,
	}, nil
}

func (tbr TransactionBulkResource) CommitDraft(ctx context.Context, _ *struct{}) (*struct {
	Body       models.BulkTransactionCommitResponseModel
	StatusCode int
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions_bulk", "POST", time.Since(start).Seconds()) }()

	resp, err := tbr.sevs.TsctBulk.CommitDraft(ctx)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body       models.BulkTransactionCommitResponseModel
		StatusCode int
	}{
		Body:       resp,
		StatusCode: 200,
	}, nil
}

func (tbr TransactionBulkResource) DeleteDraft(ctx context.Context, _ *struct{}) (*struct {
	StatusCode int
}, error) {
	start := time.Now()
	defer func() {
		observability.RecordServiceOperation("transactions_bulk", "DELETE", time.Since(start).Seconds())
	}()

	err := tbr.sevs.TsctBulk.DeleteDraft(ctx)
	if err != nil {
		return nil, err
	}

	return &struct {
		StatusCode int
	}{StatusCode: 204}, nil
}
