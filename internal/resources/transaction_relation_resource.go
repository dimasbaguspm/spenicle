package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionRelationService interface {
	GetRelatedTransactions(ctx context.Context, transactionID int) ([]schemas.TransactionSchema, error)
	GetRelatedTransaction(ctx context.Context, transactionID, relatedTransactionID int) (schemas.TransactionSchema, error)
	Create(ctx context.Context, input schemas.CreateTransactionRelationSchema) (schemas.TransactionRelationSchema, error)
	Delete(ctx context.Context, transactionID, relatedTransactionID int) error
}

type TransactionRelationResource struct {
	service TransactionRelationService
}

func NewTransactionRelationResource(service TransactionRelationService) *TransactionRelationResource {
	return &TransactionRelationResource{service: service}
}

// RegisterRoutes registers all transaction relation endpoints
func (r *TransactionRelationResource) RegisterRoutes(api huma.API) {
	// List all related transactions (full details)
	huma.Register(api, huma.Operation{
		OperationID:   "list-related-transactions",
		Method:        http.MethodGet,
		Path:          "/transactions/{id}/relations",
		Summary:       "List all related transactions",
		Tags:          []string{"Transaction Relations"},
		DefaultStatus: http.StatusOK,
	}, r.ListRelatedTransactions)

	// Create relation
	huma.Register(api, huma.Operation{
		OperationID:   "create-transaction-relation",
		Method:        http.MethodPost,
		Path:          "/transactions/{id}/relations",
		Summary:       "Create a relation between transactions",
		Tags:          []string{"Transaction Relations"},
		DefaultStatus: http.StatusCreated,
	}, r.CreateRelation)

	// Get single related transaction
	huma.Register(api, huma.Operation{
		OperationID:   "get-related-transaction",
		Method:        http.MethodGet,
		Path:          "/transactions/{id}/relations/{relatedId}",
		Summary:       "Get a single related transaction",
		Tags:          []string{"Transaction Relations"},
		DefaultStatus: http.StatusOK,
	}, r.GetRelatedTransaction)

	// Delete relation by transaction IDs
	huma.Register(api, huma.Operation{
		OperationID:   "delete-transaction-relation",
		Method:        http.MethodDelete,
		Path:          "/transactions/{id}/relations/{relatedId}",
		Summary:       "Delete a relation between transactions",
		Tags:          []string{"Transaction Relations"},
		DefaultStatus: http.StatusNoContent,
	}, r.DeleteRelation)
}

// ListRelatedTransactions endpoint
type ListRelatedTransactionsInput struct {
	ID int `path:"id" minimum:"1" doc:"Transaction ID"`
}

type ListRelatedTransactionsOutput struct {
	Body []schemas.TransactionSchema
}

func (r *TransactionRelationResource) ListRelatedTransactions(
	ctx context.Context,
	input *ListRelatedTransactionsInput,
) (*ListRelatedTransactionsOutput, error) {
	transactions, err := r.service.GetRelatedTransactions(ctx, input.ID)
	if err != nil {
		if err == repositories.ErrTransactionNotFound {
			return nil, huma.Error404NotFound("transaction not found")
		}
		return nil, huma.Error500InternalServerError("failed to list related transactions", err)
	}

	return &ListRelatedTransactionsOutput{Body: transactions}, nil
}

// GetRelatedTransaction endpoint
type GetRelatedTransactionInput struct {
	ID        int `path:"id" minimum:"1" doc:"Transaction ID"`
	RelatedID int `path:"relatedId" minimum:"1" doc:"Related transaction ID"`
}

type GetRelatedTransactionOutput struct {
	Body schemas.TransactionSchema
}

func (r *TransactionRelationResource) GetRelatedTransaction(
	ctx context.Context,
	input *GetRelatedTransactionInput,
) (*GetRelatedTransactionOutput, error) {
	transaction, err := r.service.GetRelatedTransaction(ctx, input.ID, input.RelatedID)
	if err != nil {
		if err == repositories.ErrTransactionNotFound {
			return nil, huma.Error404NotFound("transaction not found")
		}
		if err == repositories.ErrTransactionRelationNotFound {
			return nil, huma.Error404NotFound("relation not found")
		}
		return nil, huma.Error500InternalServerError("failed to get related transaction", err)
	}

	return &GetRelatedTransactionOutput{Body: transaction}, nil
}

// CreateRelation endpoint
type CreateRelationInput struct {
	ID   int `path:"id" minimum:"1" doc:"Source transaction ID"`
	Body struct {
		RelatedTransactionID int `json:"relatedTransactionId" minimum:"1" doc:"Related transaction ID"`
	}
}

type CreateRelationOutput struct {
	Body schemas.TransactionRelationSchema
}

func (r *TransactionRelationResource) CreateRelation(
	ctx context.Context,
	input *CreateRelationInput,
) (*CreateRelationOutput, error) {
	createInput := schemas.CreateTransactionRelationSchema{
		TransactionID:        input.ID,
		RelatedTransactionID: input.Body.RelatedTransactionID,
	}

	relation, err := r.service.Create(ctx, createInput)
	if err != nil {
		if err == repositories.ErrTransactionNotFound {
			return nil, huma.Error404NotFound("transaction not found")
		}
		if err == repositories.ErrCannotRelateSameTransaction {
			return nil, huma.Error400BadRequest("cannot relate a transaction to itself")
		}
		if err == repositories.ErrTransactionRelationAlreadyExists {
			return nil, huma.Error409Conflict("relation already exists")
		}
		return nil, huma.Error500InternalServerError("failed to create relation", err)
	}

	return &CreateRelationOutput{Body: relation}, nil
}

// DeleteRelation endpoint
type DeleteRelationInput struct {
	ID        int `path:"id" minimum:"1" doc:"Source transaction ID"`
	RelatedID int `path:"relatedId" minimum:"1" doc:"Related transaction ID"`
}

func (r *TransactionRelationResource) DeleteRelation(
	ctx context.Context,
	input *DeleteRelationInput,
) (*struct{}, error) {
	err := r.service.Delete(ctx, input.ID, input.RelatedID)
	if err != nil {
		if err == repositories.ErrTransactionRelationNotFound {
			return nil, huma.Error404NotFound("relation not found")
		}
		return nil, huma.Error500InternalServerError("failed to delete relation", err)
	}

	return nil, nil
}
