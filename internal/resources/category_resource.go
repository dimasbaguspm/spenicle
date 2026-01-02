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

// CategoryService defines the interface for category business logic operations.
// This allows the resource to be tested with mock implementations.
type CategoryService interface {
	List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error)
	Get(ctx context.Context, id int64) (schemas.CategorySchema, error)
	Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error)
	Delete(ctx context.Context, id int64) error
}

// BudgetService interface for budget operations in nested routes
type BudgetServiceForCategory interface {
	GetByCategoryID(ctx context.Context, categoryID int, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetSchema, error)
}

type CategoryResource struct {
	service       CategoryService
	budgetService BudgetServiceForCategory
}

func NewCategoryResource(service *services.CategoryService, budgetService *services.BudgetService) *CategoryResource {
	return &CategoryResource{
		service:       service,
		budgetService: budgetService,
	}
}

type CategoryPathParam struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the category" example:"1"`
}

type getPaginatedCategoriesRequest struct {
	schemas.SearchParamCategorySchema
}

type getPaginatedCategoriesResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedCategorySchema
}

type getCategoryRequest struct {
	CategoryPathParam
}

type getCategoryResponse struct {
	Status int `json:"-"`
	Body   schemas.CategorySchema
}

type createCategoryRequest struct {
	Body schemas.CreateCategorySchema
}

type createCategoryResponse struct {
	Status int `json:"-"`
	Body   schemas.CategorySchema
}

type updateCategoryRequest struct {
	CategoryPathParam
	Body schemas.UpdateCategorySchema
}

type updateCategoryResponse struct {
	Status int `json:"-"`
	Body   schemas.CategorySchema
}

type deleteCategoryRequest struct {
	CategoryPathParam
}

type deleteCategoryResponse struct {
	Status int `json:"-"`
}

// Category budgets nested routes
type listCategoryBudgetsRequest struct {
	CategoryPathParam
	schemas.SearchParamBudgetSchema
}

type listCategoryBudgetsResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedBudgetSchema
}

type getCategoryBudgetRequest struct {
	CategoryID int64 `path:"id" minimum:"1" doc:"Category ID" example:"1"`
	BudgetID   int64 `path:"budgetId" minimum:"1" doc:"Budget ID" example:"1"`
}

type getCategoryBudgetResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetSchema
}

// RegisterRoutes configures all category-related HTTP endpoints.
// It registers CRUD operations for category management with the Huma API.
func (cr *CategoryResource) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-categories",
		Method:      http.MethodGet,
		Path:        "/categories",
		Summary:     "List categories",
		Description: "Get a paginated list of categories with optional search",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.GetPaginated)

	huma.Register(api, huma.Operation{
		OperationID: "create-category",
		Method:      http.MethodPost,
		Path:        "/categories",
		Summary:     "Create category",
		Description: "Create a new category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-category",
		Method:      http.MethodGet,
		Path:        "/categories/{id}",
		Summary:     "Get category",
		Description: "Get a single category by ID",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-category",
		Method:      http.MethodPatch,
		Path:        "/categories/{id}",
		Summary:     "Update category",
		Description: "Update an existing category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-category",
		Method:      http.MethodDelete,
		Path:        "/categories/{id}",
		Summary:     "Delete category",
		Description: "Delete a category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Delete)

	// Nested budget routes
	huma.Register(api, huma.Operation{
		OperationID: "list-category-budgets",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/budgets",
		Summary:     "List category budgets",
		Description: "Get all budgets related to this category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.ListBudgets)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-budget",
		Method:      http.MethodGet,
		Path:        "/categories/{id}/budgets/{budgetId}",
		Summary:     "Get category budget",
		Description: "Get a specific budget related to this category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.GetBudget)
}

func (cr *CategoryResource) GetPaginated(ctx context.Context, input *getPaginatedCategoriesRequest) (*getPaginatedCategoriesResponse, error) {
	searchParams := input.SearchParamCategorySchema

	parsedResult, err := cr.service.List(ctx, searchParams)
	if err != nil {
		logger.Log().Error("Failed to list categories", "error", err)
		return nil, huma.Error500InternalServerError("Failed to list categories", err)
	}

	return &getPaginatedCategoriesResponse{Status: http.StatusOK, Body: parsedResult}, nil
}

func (cr *CategoryResource) Get(ctx context.Context, input *getCategoryRequest) (*getCategoryResponse, error) {
	categorySchema, err := cr.service.Get(ctx, input.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrCategoryNotFound.Error())
		}
		logger.Log().Error("Failed to get category", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to get category", err)
	}

	return &getCategoryResponse{Status: http.StatusOK, Body: categorySchema}, nil
}

func (cr *CategoryResource) Create(ctx context.Context, input *createCategoryRequest) (*createCategoryResponse, error) {
	createSchema := input.Body

	categorySchema, err := cr.service.Create(ctx, createSchema)
	if err != nil {
		logger.Log().Error("Failed to create category", "error", err)
		return nil, huma.Error500InternalServerError("Failed to create category", err)
	}

	return &createCategoryResponse{Status: http.StatusCreated, Body: categorySchema}, nil
}

func (cr *CategoryResource) Update(ctx context.Context, input *updateCategoryRequest) (*updateCategoryResponse, error) {
	updateSchema := input.Body

	categorySchema, err := cr.service.Update(ctx, input.ID, updateSchema)
	if err != nil {
		if errors.Is(err, repositories.ErrNoFieldsToUpdate) {
			return nil, huma.Error400BadRequest(repositories.ErrNoFieldsToUpdate.Error())
		}
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrCategoryNotFound.Error())
		}
		logger.Log().Error("Failed to update category", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to update category", err)
	}

	return &updateCategoryResponse{Status: http.StatusOK, Body: categorySchema}, nil
}

func (cr *CategoryResource) Delete(ctx context.Context, input *deleteCategoryRequest) (*deleteCategoryResponse, error) {
	if err := cr.service.Delete(ctx, input.ID); err != nil {
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound(repositories.ErrCategoryNotFound.Error())
		}
		logger.Log().Error("Failed to delete category", "id", input.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to delete category", err)
	}

	return &deleteCategoryResponse{Status: http.StatusNoContent}, nil
}

func (cr *CategoryResource) ListBudgets(ctx context.Context, input *listCategoryBudgetsRequest) (*listCategoryBudgetsResponse, error) {
	// Verify category exists
	_, err := cr.service.Get(ctx, input.CategoryPathParam.ID)
	if err != nil {
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound("Category not found")
		}
		return nil, huma.Error500InternalServerError("Failed to verify category", err)
	}

	result, err := cr.budgetService.GetByCategoryID(ctx, int(input.CategoryPathParam.ID), input.SearchParamBudgetSchema)
	if err != nil {
		logger.Log().Error("Failed to list category budgets", "categoryId", input.CategoryPathParam.ID, "error", err)
		return nil, huma.Error500InternalServerError("Failed to list budgets", err)
	}

	return &listCategoryBudgetsResponse{Status: http.StatusOK, Body: *result}, nil
}

func (cr *CategoryResource) GetBudget(ctx context.Context, input *getCategoryBudgetRequest) (*getCategoryBudgetResponse, error) {
	// Verify category exists
	_, err := cr.service.Get(ctx, input.CategoryID)
	if err != nil {
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return nil, huma.Error404NotFound("Category not found")
		}
		return nil, huma.Error500InternalServerError("Failed to verify category", err)
	}

	// Get the budget
	budget, err := cr.budgetService.Get(ctx, int(input.BudgetID))
	if err != nil {
		return nil, huma.Error404NotFound("Budget not found")
	}

	// Verify budget belongs to this category
	if budget.CategoryID == nil || *budget.CategoryID != input.CategoryID {
		return nil, huma.Error404NotFound("Budget not found for this category")
	}

	return &getCategoryBudgetResponse{Status: http.StatusOK, Body: *budget}, nil
}
