package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type TransactionResource struct {
	ts     services.TransactionService
	trs    services.TransactionRelationService
	tts    services.TransactionTagService
	ttemps services.TransactionTemplateService
}

func NewTransactionResource(ts services.TransactionService, trs services.TransactionRelationService, tts services.TransactionTagService, ttemps services.TransactionTemplateService) TransactionResource {
	return TransactionResource{ts, trs, tts, ttemps}
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
		OperationID: "list-transaction-relations",
		Method:      "GET",
		Path:        "/transactions/{transactionId}/relations",
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
		Path:        "/transactions/{transactionId}/relations",
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
		Path:        "/transactions/{transactionId}/relations/{relationId}",
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
		Path:        "/transactions/{transactionId}/relations/{relationId}",
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
	models.ListTransactionsRequestModel
}) (*struct {
	models.ListTransactionsResponseModel
}, error) {
	resp, err := tr.ts.List(ctx, input.ListTransactionsRequestModel)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.ListTransactionsResponseModel
	}{
		ListTransactionsResponseModel: resp,
	}, nil
}

func (tr TransactionResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
}) (*struct {
	models.GetTransactionResponseModel
}, error) {
	resp, err := tr.ts.Get(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.GetTransactionResponseModel
	}{
		GetTransactionResponseModel: models.GetTransactionResponseModel{TransactionModel: resp},
	}, nil
}

func (tr TransactionResource) Create(ctx context.Context, input *struct {
	Body models.CreateTransactionRequestModel
}) (*struct {
	models.CreateTransactionResponseModel
}, error) {
	resp, err := tr.ts.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.CreateTransactionResponseModel
	}{
		CreateTransactionResponseModel: resp,
	}, nil
}

func (tr TransactionResource) Update(ctx context.Context, input *struct {
	ID   int64                                `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
	Body models.UpdateTransactionRequestModel `json:""`
}) (*struct {
	models.UpdateTransactionResponseModel
}, error) {
	resp, err := tr.ts.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.UpdateTransactionResponseModel
	}{
		UpdateTransactionResponseModel: resp,
	}, nil
}

func (tr TransactionResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the transaction" example:"1"`
}) (*struct{}, error) {
	err := tr.ts.Delete(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}

// Transaction Relation Handlers

func (tr TransactionResource) ListRelations(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	PageNumber    int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize      int   `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
}) (*struct {
	models.ListTransactionRelationsResponseModel
}, error) {
	resp, err := tr.trs.List(ctx, input.TransactionID, input.PageNumber, input.PageSize)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.ListTransactionRelationsResponseModel
	}{
		ListTransactionRelationsResponseModel: resp,
	}, nil
}

func (tr TransactionResource) GetRelation(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	RelationID    int64 `path:"relationId" minimum:"1" doc:"Relation ID"`
}) (*struct {
	models.GetTransactionRelationResponseModel
}, error) {
	resp, err := tr.trs.Get(ctx, input.RelationID)
	if err != nil {
		return nil, err
	}

	// Verify the relation belongs to the transaction
	if resp.TransactionID != input.TransactionID {
		return nil, huma.Error404NotFound("Transaction relation not found")
	}

	return &struct {
		models.GetTransactionRelationResponseModel
	}{
		GetTransactionRelationResponseModel: models.GetTransactionRelationResponseModel{TransactionRelationModel: resp},
	}, nil
}

func (tr TransactionResource) CreateRelation(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	Body          models.CreateTransactionRelationRequestModel
}) (*struct {
	models.CreateTransactionRelationResponseModel
}, error) {
	// Override the transaction ID in request body with the path parameter
	input.Body.TransactionID = input.TransactionID

	resp, err := tr.trs.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.CreateTransactionRelationResponseModel
	}{
		CreateTransactionRelationResponseModel: resp,
	}, nil
}

func (tr TransactionResource) DeleteRelation(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	RelationID    int64 `path:"relationId" minimum:"1" doc:"Relation ID"`
}) (*struct{}, error) {
	// Verify the relation belongs to the transaction before deleting
	relation, err := tr.trs.Get(ctx, input.RelationID)
	if err != nil {
		return nil, err
	}

	if relation.TransactionID != input.TransactionID {
		return nil, huma.Error404NotFound("Transaction relation not found")
	}

	if err := tr.trs.Delete(ctx, input.RelationID); err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}

// Transaction Tag Handlers

func (tr TransactionResource) ListTags(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	PageNumber    int   `query:"pageNumber" default:"1" minimum:"1" doc:"Page number for pagination"`
	PageSize      int   `query:"pageSize" default:"10" minimum:"1" maximum:"100" doc:"Number of items per page"`
}) (*struct {
	models.ListTransactionTagsResponseModel
}, error) {
	resp, err := tr.tts.List(ctx, input.TransactionID, input.PageNumber, input.PageSize)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.ListTransactionTagsResponseModel
	}{
		ListTransactionTagsResponseModel: resp,
	}, nil
}

func (tr TransactionResource) GetTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	TagID         int64 `path:"tagId" minimum:"1" doc:"Tag ID"`
}) (*struct {
	models.GetTransactionTagResponseModel
}, error) {
	resp, err := tr.tts.Get(ctx, input.TransactionID, input.TagID)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.GetTransactionTagResponseModel
	}{
		GetTransactionTagResponseModel: models.GetTransactionTagResponseModel{TransactionTagModel: resp},
	}, nil
}

func (tr TransactionResource) CreateTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	Body          models.CreateTransactionTagRequestModel
}) (*struct {
	models.CreateTransactionTagResponseModel
}, error) {
	// Override the transaction ID in request body with the path parameter
	input.Body.TransactionID = input.TransactionID

	resp, err := tr.tts.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.CreateTransactionTagResponseModel
	}{
		CreateTransactionTagResponseModel: resp,
	}, nil
}

func (tr TransactionResource) DeleteTag(ctx context.Context, input *struct {
	TransactionID int64 `path:"transactionId" minimum:"1" doc:"Transaction ID"`
	TagID         int64 `path:"tagId" minimum:"1" doc:"Tag ID"`
}) (*struct{}, error) {
	// Verify the tag belongs to the transaction before deleting
	_, err := tr.tts.Get(ctx, input.TransactionID, input.TagID)
	if err != nil {
		return nil, err
	}

	if err := tr.tts.Delete(ctx, input.TransactionID, input.TagID); err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}

// Transaction Template Handlers

func (tr TransactionResource) ListTemplates(ctx context.Context, input *struct {
	models.ListTransactionTemplatesRequestModel
}) (*struct {
	models.ListTransactionTemplatesResponseModel
}, error) {
	resp, err := tr.ttemps.List(ctx, input.ListTransactionTemplatesRequestModel)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.ListTransactionTemplatesResponseModel
	}{
		ListTransactionTemplatesResponseModel: resp,
	}, nil
}

func (tr TransactionResource) GetTemplate(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
}) (*struct {
	models.GetTransactionTemplateResponseModel
}, error) {
	resp, err := tr.ttemps.Get(ctx, input.TemplateID)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.GetTransactionTemplateResponseModel
	}{
		GetTransactionTemplateResponseModel: models.GetTransactionTemplateResponseModel{TransactionTemplateModel: resp},
	}, nil
}

func (tr TransactionResource) CreateTemplate(ctx context.Context, input *struct {
	Body models.CreateTransactionTemplateRequestModel
}) (*struct {
	models.CreateTransactionTemplateResponseModel
}, error) {
	resp, err := tr.ttemps.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.CreateTransactionTemplateResponseModel
	}{
		CreateTransactionTemplateResponseModel: resp,
	}, nil
}

func (tr TransactionResource) UpdateTemplate(ctx context.Context, input *struct {
	TemplateID int64                                        `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
	Body       models.UpdateTransactionTemplateRequestModel `json:""`
}) (*struct {
	models.UpdateTransactionTemplateResponseModel
}, error) {
	resp, err := tr.ttemps.Update(ctx, input.TemplateID, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		models.UpdateTransactionTemplateResponseModel
	}{
		UpdateTransactionTemplateResponseModel: resp,
	}, nil
}

func (tr TransactionResource) DeleteTemplate(ctx context.Context, input *struct {
	TemplateID int64 `path:"templateId" minimum:"1" doc:"Unique identifier of the transaction template" example:"1"`
}) (*struct{}, error) {
	err := tr.ttemps.Delete(ctx, input.TemplateID)
	if err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}
