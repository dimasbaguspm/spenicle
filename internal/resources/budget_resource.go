package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

// BudgetTemplateService interface for budget template operations
type BudgetTemplateService interface {
	List(ctx context.Context, params schemas.SearchParamBudgetTemplateSchema) (*schemas.PaginatedBudgetTemplateSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetTemplateSchema, error)
	Create(ctx context.Context, input schemas.CreateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateBudgetTemplateSchema) (*schemas.BudgetTemplateSchema, error)
	Delete(ctx context.Context, id int) error
}

// BudgetService interface for budget operations
type BudgetService interface {
	List(ctx context.Context, params schemas.SearchParamBudgetSchema) (*schemas.PaginatedBudgetSchema, error)
	Get(ctx context.Context, id int) (*schemas.BudgetSchema, error)
	Create(ctx context.Context, input schemas.CreateBudgetSchema) (*schemas.BudgetSchema, error)
	Update(ctx context.Context, id int, input schemas.UpdateBudgetSchema) (*schemas.BudgetSchema, error)
	Delete(ctx context.Context, id int) error
}

// BudgetResource handles both budget and budget template endpoints
type BudgetResource struct {
	budgetService         BudgetService
	budgetTemplateService BudgetTemplateService
}

func NewBudgetResource(budgetService *services.BudgetService, budgetTemplateService *services.BudgetTemplateService) *BudgetResource {
	return &BudgetResource{
		budgetService:         budgetService,
		budgetTemplateService: budgetTemplateService,
	}
}

type BudgetPathParam struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the budget" example:"1"`
}

type BudgetTemplatePathParam struct {
	ID int `path:"id" minimum:"1" doc:"Unique identifier of the budget template" example:"1"`
}

// ==================== Budget Template Endpoints ====================

// List budget templates
type listBudgetTemplatesRequest struct {
	schemas.SearchParamBudgetTemplateSchema
}

type listBudgetTemplatesResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedBudgetTemplateSchema
}

func (r *BudgetResource) listBudgetTemplates(ctx context.Context, req *listBudgetTemplatesRequest) (*listBudgetTemplatesResponse, error) {
	result, err := r.budgetTemplateService.List(ctx, req.SearchParamBudgetTemplateSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list budget templates", err)
	}

	return &listBudgetTemplatesResponse{
		Status: http.StatusOK,
		Body:   *result,
	}, nil
}

// Create budget template
type createBudgetTemplateRequest struct {
	Body schemas.CreateBudgetTemplateSchema
}

type createBudgetTemplateResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetTemplateSchema
}

func (r *BudgetResource) createBudgetTemplate(ctx context.Context, req *createBudgetTemplateRequest) (*createBudgetTemplateResponse, error) {
	template, err := r.budgetTemplateService.Create(ctx, req.Body)
	if err != nil {
		// Check for validation errors
		if err == schemas.ErrBudgetTemplateRequiresTarget || err == schemas.ErrBudgetTemplateInvalidDates {
			return nil, huma.Error400BadRequest("Invalid input", err)
		}
		return nil, huma.Error500InternalServerError("Failed to create budget template", err)
	}

	return &createBudgetTemplateResponse{
		Status: http.StatusCreated,
		Body:   *template,
	}, nil
}

// Get budget template
type getBudgetTemplateRequest struct {
	BudgetTemplatePathParam
}

type getBudgetTemplateResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetTemplateSchema
}

func (r *BudgetResource) getBudgetTemplate(ctx context.Context, req *getBudgetTemplateRequest) (*getBudgetTemplateResponse, error) {
	template, err := r.budgetTemplateService.Get(ctx, req.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get budget template", err)
	}
	if template == nil {
		return nil, huma.Error404NotFound("Budget template not found")
	}

	return &getBudgetTemplateResponse{
		Status: http.StatusOK,
		Body:   *template,
	}, nil
}

// Update budget template
type updateBudgetTemplateRequest struct {
	BudgetTemplatePathParam
	Body schemas.UpdateBudgetTemplateSchema
}

type updateBudgetTemplateResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetTemplateSchema
}

func (r *BudgetResource) updateBudgetTemplate(ctx context.Context, req *updateBudgetTemplateRequest) (*updateBudgetTemplateResponse, error) {
	template, err := r.budgetTemplateService.Update(ctx, req.ID, req.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update budget template", err)
	}
	if template == nil {
		return nil, huma.Error404NotFound("Budget template not found")
	}

	return &updateBudgetTemplateResponse{
		Status: http.StatusOK,
		Body:   *template,
	}, nil
}

// Delete budget template
type deleteBudgetTemplateRequest struct {
	BudgetTemplatePathParam
}

type deleteBudgetTemplateResponse struct {
	Status int `json:"-"`
}

func (r *BudgetResource) deleteBudgetTemplate(ctx context.Context, req *deleteBudgetTemplateRequest) (*deleteBudgetTemplateResponse, error) {
	err := r.budgetTemplateService.Delete(ctx, req.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete budget template", err)
	}

	return &deleteBudgetTemplateResponse{
		Status: http.StatusNoContent,
	}, nil
}

// ==================== Budget Endpoints ====================

// List budgets
type listBudgetsRequest struct {
	schemas.SearchParamBudgetSchema
}

type listBudgetsResponse struct {
	Status int `json:"-"`
	Body   schemas.PaginatedBudgetSchema
}

func (r *BudgetResource) listBudgets(ctx context.Context, input *listBudgetsRequest) (*listBudgetsResponse, error) {
	result, err := r.budgetService.List(ctx, input.SearchParamBudgetSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list budgets", err)
	}

	return &listBudgetsResponse{Body: *result, Status: http.StatusOK}, nil
}

// Create budget
type createBudgetRequest struct {
	Body schemas.CreateBudgetSchema
}

type createBudgetResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetSchema
}

func (r *BudgetResource) createBudget(ctx context.Context, input *createBudgetRequest) (*createBudgetResponse, error) {
	budget, err := r.budgetService.Create(ctx, input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create budget", err)
	}

	return &createBudgetResponse{Body: *budget, Status: http.StatusCreated}, nil
}

// Get budget by ID
type getBudgetRequest struct {
	BudgetPathParam
}

type getBudgetResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetSchema
}

func (r *BudgetResource) getBudget(ctx context.Context, input *getBudgetRequest) (*getBudgetResponse, error) {
	budget, err := r.budgetService.Get(ctx, int(input.ID))
	if err != nil {
		return nil, huma.Error404NotFound("Budget not found")
	}

	return &getBudgetResponse{Body: *budget, Status: http.StatusOK}, nil
}

// Update budget
type updateBudgetRequest struct {
	BudgetPathParam
	Body schemas.UpdateBudgetSchema
}

type updateBudgetResponse struct {
	Status int `json:"-"`
	Body   schemas.BudgetSchema
}

func (r *BudgetResource) updateBudget(ctx context.Context, input *updateBudgetRequest) (*updateBudgetResponse, error) {
	budget, err := r.budgetService.Update(ctx, int(input.ID), input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update budget", err)
	}

	return &updateBudgetResponse{Body: *budget, Status: http.StatusOK}, nil
}

// Delete budget
type deleteBudgetRequest struct {
	BudgetPathParam
}

type deleteBudgetResponse struct {
	Status int `json:"-"`
}

func (r *BudgetResource) deleteBudget(ctx context.Context, input *deleteBudgetRequest) (*deleteBudgetResponse, error) {
	if err := r.budgetService.Delete(ctx, int(input.ID)); err != nil {
		return nil, huma.Error404NotFound("Budget not found")
	}

	return &deleteBudgetResponse{Status: http.StatusNoContent}, nil
}

func (r *BudgetResource) RegisterRoutes(api huma.API) {
	// Budget Template routes - /budgets/templates
	huma.Register(api, huma.Operation{
		OperationID: "list-budget-templates",
		Method:      http.MethodGet,
		Path:        "/budgets/templates",
		Summary:     "List budget templates",
		Description: "Retrieve a paginated list of budget templates with optional filters",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.listBudgetTemplates)

	huma.Register(api, huma.Operation{
		OperationID: "create-budget-template",
		Method:      http.MethodPost,
		Path:        "/budgets/templates",
		Summary:     "Create budget template",
		Description: "Create a new budget template for recurring budgets",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.createBudgetTemplate)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget-template",
		Method:      http.MethodGet,
		Path:        "/budgets/templates/{id}",
		Summary:     "Get budget template",
		Description: "Retrieve a specific budget template by ID",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.getBudgetTemplate)

	huma.Register(api, huma.Operation{
		OperationID: "update-budget-template",
		Method:      http.MethodPatch,
		Path:        "/budgets/templates/{id}",
		Summary:     "Update budget template",
		Description: "Update an existing budget template",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.updateBudgetTemplate)

	huma.Register(api, huma.Operation{
		OperationID: "delete-budget-template",
		Method:      http.MethodDelete,
		Path:        "/budgets/templates/{id}",
		Summary:     "Delete budget template",
		Description: "Soft delete a budget template",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.deleteBudgetTemplate)

	// Budget routes - /budgets
	huma.Register(api, huma.Operation{
		OperationID: "list-budgets",
		Method:      http.MethodGet,
		Path:        "/budgets",
		Summary:     "List budgets",
		Description: "Retrieve a paginated list of budgets",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.listBudgets)

	huma.Register(api, huma.Operation{
		OperationID: "create-budget",
		Method:      http.MethodPost,
		Path:        "/budgets",
		Summary:     "Create budget",
		Description: "Create a new budget",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.createBudget)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget",
		Method:      http.MethodGet,
		Path:        "/budgets/{id}",
		Summary:     "Get budget",
		Description: "Retrieve a budget by ID",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.getBudget)

	huma.Register(api, huma.Operation{
		OperationID: "update-budget",
		Method:      http.MethodPatch,
		Path:        "/budgets/{id}",
		Summary:     "Update budget",
		Description: "Update an existing budget",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.updateBudget)

	huma.Register(api, huma.Operation{
		OperationID: "delete-budget",
		Method:      http.MethodDelete,
		Path:        "/budgets/{id}",
		Summary:     "Delete budget",
		Description: "Delete a budget by ID",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.deleteBudget)
}
