package resources

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type TransactionResource struct {
	sevs services.RootService
}

func NewTransactionResource(sevs services.RootService) TransactionResource {
	return TransactionResource{sevs}
}
func (tr TransactionResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-transactions",
		Method:      "GET",
		Path:        "/transactions",
		Summary:     "List transactions",
		Description: "Get a paginated list of transactions with optional filters",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.List)
	huma.Register(api, huma.Operation{
		OperationID: "create-transaction",
		Method:      "POST",
		Path:        "/transactions",
		Summary:     "Create transaction",
		Description: "Create a new transaction",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Create)
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction",
		Method:      "GET",
		Path:        "/transactions/{id}",
		Summary:     "Get transaction",
		Description: "Get a single transaction by ID",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Get)
	huma.Register(api, huma.Operation{
		OperationID: "update-transaction",
		Method:      "PATCH",
		Path:        "/transactions/{id}",
		Summary:     "Update transaction",
		Description: "Update an existing transaction",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Update)
	huma.Register(api, huma.Operation{
		OperationID: "delete-transaction",
		Method:      "DELETE",
		Path:        "/transactions/{id}",
		Summary:     "Delete transaction",
		Description: "Delete a transaction",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Delete)
	huma.Register(api, huma.Operation{
		OperationID: "list-transaction-templates",
		Method:      "GET",
		Path:        "/transaction-templates",
		Summary:     "List transaction templates",
		Description: "Get a paginated list of transaction templates",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.ListTemplates)
	huma.Register(api, huma.Operation{
		OperationID: "create-transaction-template",
		Method:      "POST",
		Path:        "/transaction-templates",
		Summary:     "Create transaction template",
		Description: "Create a new transaction template for recurring/installment payments",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.CreateTemplate)
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction-template",
		Method:      "GET",
		Path:        "/transaction-templates/{templateId}",
		Summary:     "Get transaction template",
		Description: "Get a single transaction template by ID",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.GetTemplate)
	huma.Register(api, huma.Operation{
		OperationID: "update-transaction-template",
		Method:      "PATCH",
		Path:        "/transaction-templates/{templateId}",
		Summary:     "Update transaction template",
		Description: "Update an existing transaction template",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.UpdateTemplate)
	huma.Register(api, huma.Operation{
		OperationID: "delete-transaction-template",
		Method:      "DELETE",
		Path:        "/transaction-templates/{templateId}",
		Summary:     "Delete transaction template",
		Description: "Delete a transaction template",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.DeleteTemplate)
	huma.Register(api, huma.Operation{
		OperationID: "list-transaction-template-related-transactions",
		Method:      "GET",
		Path:        "/transaction-templates/{templateId}/related",
		Summary:     "List related transactions",
		Description: "Get a paginated list of transactions related to a template",
		Tags:        []string{"Transaction Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.ListTemplateRelatedTransactions)
	huma.Register(api, huma.Operation{
		OperationID: "list-transaction-relations",
		Method:      "GET",
		Path:        "/transactions/{sourceTransactionId}/relations",
		Summary:     "List transaction relations",
		Description: "Get a paginated list of relations for a transaction",
		Tags:        []string{"Transaction Relations"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.ListRelations)
	huma.Register(api, huma.Operation{
		OperationID: "create-transaction-relation",
		Method:      "POST",
		Path:        "/transactions/{sourceTransactionId}/relations",
		Summary:     "Create transaction relation",
		Description: "Create a relation between two transactions",
		Tags:        []string{"Transaction Relations"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.CreateRelation)
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction-relation",
		Method:      "GET",
		Path:        "/transactions/{sourceTransactionId}/relations/{relationId}",
		Summary:     "Get transaction relation",
		Description: "Get a specific relation between transactions",
		Tags:        []string{"Transaction Relations"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.GetRelation)
	huma.Register(api, huma.Operation{
		OperationID: "delete-transaction-relation",
		Method:      "DELETE",
		Path:        "/transactions/{sourceTransactionId}/relations/{relationId}",
		Summary:     "Delete transaction relation",
		Description: "Delete a relation between transactions",
		Tags:        []string{"Transaction Relations"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.DeleteRelation)
	// Transaction Tags
	huma.Register(api, huma.Operation{
		OperationID: "list-transaction-tags",
		Method:      "GET",
		Path:        "/transactions/{transactionId}/tags",
		Summary:     "List transaction tags",
		Description: "Get a paginated list of tags for a transaction",
		Tags:        []string{"Transaction Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.ListTags)
	huma.Register(api, huma.Operation{
		OperationID: "create-transaction-tag",
		Method:      "POST",
		Path:        "/transactions/{transactionId}/tags",
		Summary:     "Add tag to transaction",
		Description: "Add a tag to a transaction",
		Tags:        []string{"Transaction Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.CreateTag)
	huma.Register(api, huma.Operation{
		OperationID: "get-transaction-tag",
		Method:      "GET",
		Path:        "/transactions/{transactionId}/tags/{tagId}",
		Summary:     "Get transaction tag",
		Description: "Get a specific tag on a transaction",
		Tags:        []string{"Transaction Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.GetTag)
	huma.Register(api, huma.Operation{
		OperationID: "delete-transaction-tag",
		Method:      "DELETE",
		Path:        "/transactions/{transactionId}/tags/{tagId}",
		Summary:     "Remove tag from transaction",
		Description: "Remove a tag from a transaction",
		Tags:        []string{"Transaction Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.DeleteTag)
}
func (tr TransactionResource) List(ctx context.Context, input *struct {
	models.TransactionsSearchModel
}) (*struct {
	Body models.TransactionsPagedModel
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions", "GET", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := tr.sevs.Tsct.GetPaged(ctx, input.TransactionsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.TransactionsPagedModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
}) (*struct {
	Body models.TransactionModel
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions", "GET", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.ID)
	resp, err := tr.sevs.Tsct.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "transaction_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.ID)
	return &struct {
		Body models.TransactionModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) Create(ctx context.Context, input *struct {
	Body models.CreateTransactionModel
}) (*struct {
	Body models.TransactionModel
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions", "POST", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := tr.sevs.Tsct.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.TransactionModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
	Body models.UpdateTransactionModel
}) (*struct {
	Body models.TransactionModel
}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions", "PATCH", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.ID)
	resp, err := tr.sevs.Tsct.Update(ctx, input.ID, input.Body)
	if err != nil {
		logger.Error("error", "transaction_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.ID)
	return &struct {
		Body models.TransactionModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
}) (*struct{}, error) {
	start := time.Now()
	defer func() { observability.RecordServiceOperation("transactions", "DELETE", time.Since(start).Seconds()) }()
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.ID)
	err := tr.sevs.Tsct.Delete(ctx, input.ID)
	if err != nil {
		logger.Error("error", "transaction_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.ID)
	return &struct{}{}, nil
}

// Transaction Relation Handlers
func (tr TransactionResource) ListRelations(ctx context.Context, input *struct {
	models.TransactionRelationsSearchModel
}) (*struct {
	Body models.TransactionRelationsPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "source_transaction_id", input.SourceTransactionID)
	resp, err := tr.sevs.TsctRel.GetPaged(ctx, input.TransactionRelationsSearchModel)
	if err != nil {
		logger.Error("error", "source_transaction_id", input.SourceTransactionID, "error", err)
		return nil, err
	}
	logger.Info("start", "source_transaction_id", input.SourceTransactionID)
	return &struct {
		Body models.TransactionRelationsPagedModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) GetRelation(ctx context.Context, input *struct {
	models.TransactionRelationGetModel
}) (*struct {
	Body models.TransactionRelationModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID)
	resp, err := tr.sevs.TsctRel.GetDetail(ctx, input.TransactionRelationGetModel)
	if err != nil {
		logger.Error("error", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID, "error", err)
		return nil, err
	}
	logger.Info("start", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID)
	return &struct {
		Body models.TransactionRelationModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) CreateRelation(ctx context.Context, input *struct {
	Body models.CreateTransactionRelationModel
}) (*struct {
	Body models.TransactionRelationModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "source_transaction_id", input.Body.SourceTransactionID)
	resp, err := tr.sevs.TsctRel.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "source_transaction_id", input.Body.SourceTransactionID, "error", err)
		return nil, err
	}
	logger.Info("start", "source_transaction_id", input.Body.SourceTransactionID)
	return &struct {
		Body models.TransactionRelationModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) DeleteRelation(ctx context.Context, input *struct {
	models.DeleteTransactionRelationModel
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID)
	if err := tr.sevs.TsctRel.Delete(ctx, input.DeleteTransactionRelationModel); err != nil {
		logger.Error("error", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID, "error", err)
		return nil, err
	}
	logger.Info("start", "source_transaction_id", input.SourceTransactionID, "relation_id", input.RelationID)
	return nil, nil
}

// Transaction Tag Handlers
func (tr TransactionResource) ListTags(ctx context.Context, input *struct {
	models.TransactionTagsSearchModel
}) (*struct {
	Body models.TransactionTagsPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.TransactionID)
	resp, err := tr.sevs.TsctTag.GetPaged(ctx, input.TransactionTagsSearchModel)
	if err != nil {
		logger.Error("error", "transaction_id", input.TransactionID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.TransactionID)
	return &struct {
		Body models.TransactionTagsPagedModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) GetTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	TagID         int64 `path:"tagId" minimum:"1" doc:"Tag ID"`
}) (*struct {
	Body models.TransactionTagModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.TransactionID, "tag_id", input.TagID)
	resp, err := tr.sevs.TsctTag.GetDetail(ctx, input.TagID)
	if err != nil {
		logger.Error("error", "transaction_id", input.TransactionID, "tag_id", input.TagID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.TransactionID, "tag_id", input.TagID)
	return &struct {
		Body models.TransactionTagModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) CreateTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	Body          models.CreateTransactionTagModel
}) (*struct {
	Body models.TransactionTagModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.TransactionID)
	input.Body.TransactionID = input.TransactionID
	resp, err := tr.sevs.TsctTag.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "transaction_id", input.TransactionID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.TransactionID)
	return &struct {
		Body models.TransactionTagModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) DeleteTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	TagID         int64 `path:"tagId" minimum:"1" doc:"Tag ID"`
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "transaction_id", input.TransactionID, "tag_id", input.TagID)
	if err := tr.sevs.TsctTag.Delete(ctx, input.TransactionID, input.TagID); err != nil {
		logger.Error("error", "transaction_id", input.TransactionID, "tag_id", input.TagID, "error", err)
		return nil, err
	}
	logger.Info("start", "transaction_id", input.TransactionID, "tag_id", input.TagID)
	return &struct{}{}, nil
}

// Transaction Template Handlers
func (tr TransactionResource) ListTemplates(ctx context.Context, input *struct {
	models.TransactionTemplatesSearchModel
}) (*struct {
	Body models.TransactionTemplatesPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := tr.sevs.TsctTem.GetPaged(ctx, input.TransactionTemplatesSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.TransactionTemplatesPagedModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) GetTemplate(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
}) (*struct {
	Body models.TransactionTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.TemplateID)
	resp, err := tr.sevs.TsctTem.GetDetail(ctx, input.TemplateID)
	if err != nil {
		logger.Error("error", "template_id", input.TemplateID, "error", err)
		return nil, err
	}
	logger.Info("start", "template_id", input.TemplateID)
	return &struct {
		Body models.TransactionTemplateModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) CreateTemplate(ctx context.Context, input *struct {
	Body models.CreateTransactionTemplateModel
}) (*struct {
	Body models.TransactionTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := tr.sevs.TsctTem.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.TransactionTemplateModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) UpdateTemplate(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
	Body       models.UpdateTransactionTemplateModel
}) (*struct {
	Body models.TransactionTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.TemplateID)
	resp, err := tr.sevs.TsctTem.Update(ctx, input.TemplateID, input.Body)
	if err != nil {
		logger.Error("error", "template_id", input.TemplateID, "error", err)
		return nil, err
	}
	logger.Info("start", "template_id", input.TemplateID)
	return &struct {
		Body models.TransactionTemplateModel
	}{
		Body: resp,
	}, nil
}
func (tr TransactionResource) DeleteTemplate(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.TemplateID)
	err := tr.sevs.TsctTem.Delete(ctx, input.TemplateID)
	if err != nil {
		logger.Error("error", "template_id", input.TemplateID, "error", err)
		return nil, err
	}
	logger.Info("start", "template_id", input.TemplateID)
	return nil, nil
}
func (tr TransactionResource) ListTemplateRelatedTransactions(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
	models.TransactionTemplateRelatedTransactionsSearchModel
}) (*struct {
	Body models.TransactionsPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.TemplateID)
	result, err := tr.sevs.TsctTem.GetRelatedTransactions(ctx, input.TemplateID, input.TransactionTemplateRelatedTransactionsSearchModel)
	if err != nil {
		logger.Error("error", "template_id", input.TemplateID, "error", err)
		return nil, err
	}
	logger.Info("start", "template_id", input.TemplateID)
	return &struct {
		Body models.TransactionsPagedModel
	}{
		Body: result,
	}, nil
}
