package resources

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// TransactionService defines the interface for transaction business logic operations.
// This allows the resource to be tested with mock implementations.
type TransactionService interface {
	List(ctx context.Context, params schemas.SearchParamTransactionSchema) (schemas.PaginatedTransactionSchema, error)
	Get(ctx context.Context, id int) (schemas.TransactionSchema, error)
	Create(ctx context.Context, input schemas.CreateTransactionSchema) (schemas.TransactionSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateTransactionSchema) (schemas.TransactionSchema, error)
	Delete(ctx context.Context, id int) error
}

type TransactionResource struct {
	service TransactionService
}

func NewTransactionResource(service TransactionService) *TransactionResource {
	return &TransactionResource{service: service}
}

// RegisterRoutes registers all transaction routes
func (r *TransactionResource) RegisterRoutes(api huma.API, prefix string) {
	huma.Register(api, huma.Operation{
		OperationID: "list-transactions",
		Method:      http.MethodGet,
		Path:        prefix + "/transactions",
		Summary:     "List transactions",
		Description: "Returns a paginated list of transactions",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.List)

	huma.Register(api, huma.Operation{
		OperationID: "create-transaction",
		Method:      http.MethodPost,
		Path:        prefix + "/transactions",
		Summary:     "Create a new transaction",
		Description: "Creates a new transaction and updates account balance",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-transaction",
		Method:      http.MethodGet,
		Path:        prefix + "/transactions/{id}",
		Summary:     "Get a transaction",
		Description: "Returns a transaction by ID",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-transaction",
		Method:      http.MethodPatch,
		Path:        prefix + "/transactions/{id}",
		Summary:     "Update a transaction",
		Description: "Updates a transaction by ID and syncs account balance",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-transaction",
		Method:      http.MethodDelete,
		Path:        prefix + "/transactions/{id}",
		Summary:     "Delete a transaction",
		Description: "Soft deletes a transaction by ID and reverts account balance",
		Tags:        []string{"Transactions"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.Delete)
}

type ListTransactionsInput struct {
	schemas.SearchParamTransactionSchema
}

type ListTransactionsOutput struct {
	Body schemas.PaginatedTransactionSchema
}

func (r *TransactionResource) List(ctx context.Context, input *ListTransactionsInput) (*ListTransactionsOutput, error) {
	result, err := r.service.List(ctx, input.SearchParamTransactionSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list transactions", err)
	}

	return &ListTransactionsOutput{Body: result}, nil
}

type CreateTransactionInput struct {
	Body schemas.CreateTransactionSchema
}

type CreateTransactionOutput struct {
	Body schemas.TransactionSchema
}

func (r *TransactionResource) Create(ctx context.Context, input *CreateTransactionInput) (*CreateTransactionOutput, error) {
	transaction, err := r.service.Create(ctx, input.Body)
	if err != nil {
		if errors.Is(err, repositories.ErrTransactionTypeCategoryMismatch) {
			return nil, huma.Error422UnprocessableEntity("Transaction type must match category type", err)
		}
		if errors.Is(err, repositories.ErrInvalidAccountTypeForExpense) {
			return nil, huma.Error422UnprocessableEntity("Expense transactions can only use expense or income account types", err)
		}
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound("Account not found", err)
		}
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound("Category not found", err)
		}
		return nil, huma.Error500InternalServerError("Failed to create transaction", err)
	}

	return &CreateTransactionOutput{Body: transaction}, nil
}

type GetTransactionInput struct {
	ID int `path:"id" doc:"Transaction ID" example:"1" minimum:"1"`
}

type GetTransactionOutput struct {
	Body schemas.TransactionSchema
}

func (r *TransactionResource) Get(ctx context.Context, input *GetTransactionInput) (*GetTransactionOutput, error) {
	transaction, err := r.service.Get(ctx, input.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrTransactionNotFound) {
			return nil, huma.Error404NotFound("Transaction not found", err)
		}
		return nil, huma.Error500InternalServerError("Failed to get transaction", err)
	}

	return &GetTransactionOutput{Body: transaction}, nil
}

type UpdateTransactionInput struct {
	ID   int `path:"id" doc:"Transaction ID" example:"1" minimum:"1"`
	Body schemas.UpdateTransactionSchema
}

type UpdateTransactionOutput struct {
	Body schemas.TransactionSchema
}

func (r *TransactionResource) Update(ctx context.Context, input *UpdateTransactionInput) (*UpdateTransactionOutput, error) {
	transaction, err := r.service.Update(ctx, input.ID, input.Body)
	if err != nil {
		if errors.Is(err, repositories.ErrNoFieldsToUpdate) {
			return nil, huma.Error400BadRequest("At least one field must be provided to update", err)
		}
		if errors.Is(err, repositories.ErrTransactionNotFound) {
			return nil, huma.Error404NotFound("Transaction not found", err)
		}
		if errors.Is(err, repositories.ErrTransactionTypeCategoryMismatch) {
			return nil, huma.Error422UnprocessableEntity("Transaction type must match category type", err)
		}
		if errors.Is(err, repositories.ErrInvalidAccountTypeForExpense) {
			return nil, huma.Error422UnprocessableEntity("Expense transactions can only use expense or income account types", err)
		}
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound("Account not found", err)
		}
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound("Category not found", err)
		}
		return nil, huma.Error500InternalServerError("Failed to update transaction", err)
	}

	return &UpdateTransactionOutput{Body: transaction}, nil
}

type DeleteTransactionInput struct {
	ID int `path:"id" doc:"Transaction ID" example:"1" minimum:"1"`
}

func (r *TransactionResource) Delete(ctx context.Context, input *DeleteTransactionInput) (*struct{}, error) {
	err := r.service.Delete(ctx, input.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrTransactionNotFound) {
			return nil, huma.Error404NotFound("Transaction not found", err)
		}
		return nil, huma.Error500InternalServerError("Failed to delete transaction", err)
	}

	return nil, nil
}
