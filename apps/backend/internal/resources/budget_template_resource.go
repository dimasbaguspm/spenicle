package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type BudgetTemplateResource struct {
	bts services.BudgetTemplateService
}

func NewBudgetTemplateResource(bts services.BudgetTemplateService) BudgetTemplateResource {
	return BudgetTemplateResource{bts}
}

func (btr BudgetTemplateResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-budget-templates",
		Method:      http.MethodGet,
		Path:        "/budgets/templates",
		Summary:     "List budget templates",
		Description: "Get a paginated list of budget templates",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.List)

	huma.Register(api, huma.Operation{
		OperationID: "create-budget-template",
		Method:      http.MethodPost,
		Path:        "/budgets/templates",
		Summary:     "Create budget template",
		Description: "Create a new budget template",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget-template",
		Method:      http.MethodGet,
		Path:        "/budgets/templates/{id}",
		Summary:     "Get budget template",
		Description: "Get a single budget template by ID",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-budget-template",
		Method:      http.MethodPatch,
		Path:        "/budgets/templates/{id}",
		Summary:     "Update budget template",
		Description: "Update an existing budget template",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-budget-template",
		Method:      http.MethodDelete,
		Path:        "/budgets/templates/{id}",
		Summary:     "Delete budget template",
		Description: "Soft delete a budget template",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.Delete)
}

func (btr BudgetTemplateResource) List(ctx context.Context, input *struct {
	models.ListBudgetTemplatesRequestModel
}) (*struct {
	models.ListBudgetTemplatesResponseModel
}, error) {
	resp, err := btr.bts.List(ctx, input.ListBudgetTemplatesRequestModel)
	if err != nil {
		return nil, err
	}
	return &struct {
		models.ListBudgetTemplatesResponseModel
	}{resp}, nil
}

func (btr BudgetTemplateResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
}) (*struct {
	models.BudgetTemplateModel
}, error) {
	item, err := btr.bts.Get(ctx, input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Budget template not found")
	}
	return &struct {
		models.BudgetTemplateModel
	}{item}, nil
}

func (btr BudgetTemplateResource) Create(ctx context.Context, input *struct {
	Body models.CreateBudgetTemplateRequestModel
}) (*struct {
	models.CreateBudgetTemplateResponseModel
}, error) {
	resp, err := btr.bts.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}
	return &struct {
		models.CreateBudgetTemplateResponseModel
	}{resp}, nil
}

func (btr BudgetTemplateResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
	Body models.UpdateBudgetTemplateRequestModel
}) (*struct {
	models.UpdateBudgetTemplateResponseModel
}, error) {
	resp, err := btr.bts.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}
	return &struct {
		models.UpdateBudgetTemplateResponseModel
	}{resp}, nil
}

func (btr BudgetTemplateResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
}) (*struct{}, error) {
	if err := btr.bts.Delete(ctx, input.ID); err != nil {
		return nil, err
	}
	return &struct{}{}, nil
}
