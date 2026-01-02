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

type CategoryResource struct {
	service CategoryService
}

func NewCategoryResource(service *services.CategoryService) *CategoryResource {
	return &CategoryResource{service: service}
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
