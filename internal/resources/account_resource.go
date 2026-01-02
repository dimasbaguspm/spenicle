package resources

import (
	"context"
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

// Add interface (doesn't break existing code)
type AccountStore interface {
	List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	Get(ctx context.Context, id int64) (schemas.AccountSchema, error)
	Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	Delete(ctx context.Context, id int64) error
}

type AccountResource struct {
	store AccountStore
}

func NewAccountResource(store *repositories.AccountRepository) *AccountResource {
	return &AccountResource{store: store}
}

type AccountPathParam struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
}

type getPaginatedAccountsRequest struct {
	schemas.SearchParamAccountSchema
}

type getPaginatedAccountsResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedAccountSchema
}

type getAccountRequest struct {
	AccountPathParam
}

type getAccountResponse struct {
	Status int `json:"-"`
	Body   schemas.AccountSchema
}

type createAccountRequest struct {
	Body schemas.CreateAccountSchema
}

type createAccountResponse struct {
	Status int `json:"-"`
	Body   schemas.AccountSchema
}

type updateAccountRequest struct {
	AccountPathParam
	Body schemas.UpdateAccountSchema
}

type updateAccountResponse struct {
	Status int `json:"-"`
	Body   schemas.AccountSchema
}

type deleteAccountRequest struct {
	AccountPathParam
}

type deleteAccountResponse struct {
	Status int `json:"-"`
}

// RegisterRoutes configures all account-related HTTP endpoints.
// It registers CRUD operations for account management with the Huma API.
func (ar *AccountResource) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-accounts",
		Method:      http.MethodGet,
		Path:        "/accounts",
		Summary:     "List accounts",
		Description: "Get a paginated list of accounts with optional search",
		Tags:        []string{"Accounts"},
	}, ar.GetPaginated)

	huma.Register(api, huma.Operation{
		OperationID: "create-account",
		Method:      http.MethodPost,
		Path:        "/accounts",
		Summary:     "Create account",
		Description: "Create a new account",
		Tags:        []string{"Accounts"},
	}, ar.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-account",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}",
		Summary:     "Get account",
		Description: "Get a single account by ID",
		Tags:        []string{"Accounts"},
	}, ar.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-account",
		Method:      http.MethodPatch,
		Path:        "/accounts/{id}",
		Summary:     "Update account",
		Description: "Update an existing account",
		Tags:        []string{"Accounts"},
	}, ar.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-account",
		Method:      http.MethodDelete,
		Path:        "/accounts/{id}",
		Summary:     "Delete account",
		Description: "Delete an account",
		Tags:        []string{"Accounts"},
	}, ar.Delete)
}

func (ar *AccountResource) GetPaginated(ctx context.Context, input *getPaginatedAccountsRequest) (*getPaginatedAccountsResponse, error) {
	searchParams := input.SearchParamAccountSchema

	parsedResult, err := ar.store.List(ctx, searchParams)
	if err != nil {
		log.Printf("Failed to list accounts: %v", err)
		return nil, huma.Error500InternalServerError("Failed to list accounts", err)
	}

	return &getPaginatedAccountsResponse{Status: http.StatusOK, Body: parsedResult}, nil
}

func (ar *AccountResource) Get(ctx context.Context, input *getAccountRequest) (*getAccountResponse, error) {
	accountSchema, err := ar.store.Get(ctx, input.ID)

	if err != nil {
		log.Printf("Failed to get account %d: %v", input.ID, err)
		return nil, huma.Error404NotFound("Account not found", err)
	}

	return &getAccountResponse{Status: http.StatusOK, Body: accountSchema}, nil
}

func (ar *AccountResource) Create(ctx context.Context, input *createAccountRequest) (*createAccountResponse, error) {
	createSchema := input.Body

	accountSchema, err := ar.store.Create(ctx, createSchema)
	if err != nil {
		log.Printf("Failed to create account: %v", err)
		return nil, huma.Error500InternalServerError("Failed to create account", err)
	}

	return &createAccountResponse{Status: http.StatusCreated, Body: accountSchema}, nil
}

func (ar *AccountResource) Update(ctx context.Context, input *updateAccountRequest) (*updateAccountResponse, error) {
	updateSchema := input.Body

	// Validate at least one field is provided for update
	if updateSchema.Name == nil && updateSchema.Type == nil && updateSchema.Note == nil && updateSchema.Amount == nil {
		return nil, huma.Error400BadRequest("At least one field must be provided to update")
	}

	accountSchema, err := ar.store.Update(ctx, input.ID, updateSchema)
	if err != nil {
		log.Printf("Failed to update account %d: %v", input.ID, err)
		return nil, huma.Error500InternalServerError("Failed to update account", err)
	}

	return &updateAccountResponse{Status: http.StatusOK, Body: accountSchema}, nil
}

func (ar *AccountResource) Delete(ctx context.Context, input *deleteAccountRequest) (*deleteAccountResponse, error) {
	if err := ar.store.Delete(ctx, input.ID); err != nil {
		log.Printf("Failed to delete account %d: %v", input.ID, err)
		return nil, huma.Error500InternalServerError("Failed to delete account", err)
	}

	return &deleteAccountResponse{Status: http.StatusNoContent}, nil
}
