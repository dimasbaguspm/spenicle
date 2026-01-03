package resources

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/observability/logger"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

// AccountService defines the interface for account business logic operations.
// This allows the resource to be tested with mock implementations.
type AccountService interface {
	List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error)
	Get(ctx context.Context, id int64) (schemas.AccountSchema, error)
	Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
	Delete(ctx context.Context, id int64) error
	Reorder(ctx context.Context, items []schemas.AccountReorderItemSchema) error
}

// BudgetService interface for budget operations in nested routes
type BudgetServiceForAccount interface {
	GetByAccountID(ctx context.Context, accountID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetSchema, error)
}

type AccountResource struct {
	service       AccountService
	budgetService BudgetServiceForAccount
}

func NewAccountResource(service *services.AccountService, budgetService *services.BudgetService) *AccountResource {
	return &AccountResource{
		service:       service,
		budgetService: budgetService,
	}
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

type reorderAccountsRequest struct {
	Body schemas.AccountReorderSchema
}

type reorderAccountsResponse struct {
	Status int `json:"-"`
}

// Account budgets nested routes
type listAccountBudgetsRequest struct {
	AccountPathParam
	schemas.SearchParamBudgetSchema
}

type listAccountBudgetsResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedBudgetSchema
}

type getAccountBudgetRequest struct {
	AccountID int64 `path:"id" minimum:"1" doc:"Account ID" example:"1"`
	BudgetID  int64 `path:"budgetId" minimum:"1" doc:"Budget ID" example:"1"`
}

type getAccountBudgetResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetSchema
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
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.GetPaginated)

	huma.Register(api, huma.Operation{
		OperationID: "create-account",
		Method:      http.MethodPost,
		Path:        "/accounts",
		Summary:     "Create account",
		Description: "Create a new account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-account",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}",
		Summary:     "Get account",
		Description: "Get a single account by ID",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-account",
		Method:      http.MethodPatch,
		Path:        "/accounts/{id}",
		Summary:     "Update account",
		Description: "Update an existing account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-account",
		Method:      http.MethodDelete,
		Path:        "/accounts/{id}",
		Summary:     "Delete account",
		Description: "Delete an account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Delete)

	// Reorder endpoint
	huma.Register(api, huma.Operation{
		OperationID: "reorder-accounts",
		Method:      http.MethodPost,
		Path:        "/accounts/reorder",
		Summary:     "Reorder accounts",
		Description: "Update display order for multiple accounts",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Reorder)

	// Nested budget routes
	huma.Register(api, huma.Operation{
		OperationID: "list-account-budgets",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/budgets",
		Summary:     "List account budgets",
		Description: "Get all budgets related to this account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.ListBudgets)

	huma.Register(api, huma.Operation{
		OperationID: "get-account-budget",
		Method:      http.MethodGet,
		Path:        "/accounts/{id}/budgets/{budgetId}",
		Summary:     "Get account budget",
		Description: "Get a specific budget related to this account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.GetBudget)
}

func (ar *AccountResource) GetPaginated(ctx context.Context, input *getPaginatedAccountsRequest) (*getPaginatedAccountsResponse, error) {
	searchParams := input.SearchParamAccountSchema

	parsedResult, err := ar.service.List(ctx, searchParams)
	if err != nil {
		logger.Log().Error("Failed to list accounts", "error", err)
		return nil, huma.Error500InternalServerError("Failed to list accounts", err)
	}

	return &getPaginatedAccountsResponse{Status: http.StatusOK, Body: parsedResult}, nil
}

func (ar *AccountResource) Get(ctx context.Context, input *getAccountRequest) (*getAccountResponse, error) {
	accountSchema, err := ar.service.Get(ctx, input.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrAccountNotFound.Error())
		}
		logger.Log().Error("Failed to get account", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to get account", err)
	}

	return &getAccountResponse{Status: http.StatusOK, Body: accountSchema}, nil
}

func (ar *AccountResource) Create(ctx context.Context, input *createAccountRequest) (*createAccountResponse, error) {
	createSchema := input.Body

	accountSchema, err := ar.service.Create(ctx, createSchema)
	if err != nil {
		logger.Log().Error("Failed to create account", "error", err)
		return nil, huma.Error500InternalServerError("Failed to create account", err)
	}

	return &createAccountResponse{Status: http.StatusCreated, Body: accountSchema}, nil
}

func (ar *AccountResource) Update(ctx context.Context, input *updateAccountRequest) (*updateAccountResponse, error) {
	updateSchema := input.Body

	accountSchema, err := ar.service.Update(ctx, input.ID, updateSchema)
	if err != nil {
		if errors.Is(err, repositories.ErrNoFieldsToUpdate) {
			return nil, huma.Error400BadRequest(repositories.ErrNoFieldsToUpdate.Error())
		}
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrAccountNotFound.Error())
		}
		logger.Log().Error("Failed to update account", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to update account", err)
	}

	return &updateAccountResponse{Status: http.StatusOK, Body: accountSchema}, nil
}

func (ar *AccountResource) Delete(ctx context.Context, input *deleteAccountRequest) (*deleteAccountResponse, error) {
	if err := ar.service.Delete(ctx, input.ID); err != nil {
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrAccountNotFound.Error())
		}
		logger.Log().Error("Failed to delete account", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to delete account", err)
	}

	return &deleteAccountResponse{Status: http.StatusNoContent}, nil
}

// Reorder handles batch updates of account display order.
// Returns 204 No Content on success.
func (ar *AccountResource) Reorder(ctx context.Context, input *reorderAccountsRequest) (*reorderAccountsResponse, error) {
	if err := ar.service.Reorder(ctx, input.Body.Items); err != nil {
		logger.Log().Error("Failed to reorder accounts", "error", err)
		return nil, huma.Error400BadRequest("Failed to reorder accounts", err)
	}

	return &reorderAccountsResponse{Status: http.StatusNoContent}, nil
}

func (ar *AccountResource) ListBudgets(ctx context.Context, input *listAccountBudgetsRequest) (*listAccountBudgetsResponse, error) {
	// Verify account exists
	_, err := ar.service.Get(ctx, input.AccountPathParam.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound("Account not found")
		}
		return nil, huma.Error500InternalServerError("Failed to verify account", err)
	}

	result, err := ar.budgetService.GetByAccountID(ctx, int(input.AccountPathParam.ID), input.SearchParamBudgetSchema)
	if err != nil {
		logger.Log().Error("Failed to list account budgets", "accountId", input.AccountPathParam.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to list budgets", err)
	}

	return &listAccountBudgetsResponse{Status: http.StatusOK, Body: *result}, nil
}

func (ar *AccountResource) GetBudget(ctx context.Context, input *getAccountBudgetRequest) (*getAccountBudgetResponse, error) {
	// Verify account exists
	_, err := ar.service.Get(ctx, input.AccountID)
	if err != nil {
		if errors.Is(err, repositories.ErrAccountNotFound) {
			return nil, huma.Error404NotFound("Account not found")
		}
		return nil, huma.Error500InternalServerError("Failed to verify account", err)
	}

	// Get the budget
	budget, err := ar.budgetService.Get(ctx, int(input.BudgetID))
	if err != nil {
		return nil, huma.Error404NotFound("Budget not found")
	}

	// Verify budget belongs to this account
	if budget.AccountID == nil || *budget.AccountID != input.AccountID {
		return nil, huma.Error404NotFound("Budget not found for this account")
	}

	return &getAccountBudgetResponse{Status: http.StatusOK, Body: *budget}, nil
}
