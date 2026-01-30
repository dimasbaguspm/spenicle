package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type BudgetResource struct {
	sevs services.RootService
}

func NewBudgetResource(sevs services.RootService) BudgetResource {
	return BudgetResource{sevs}
}

func (br BudgetResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-budgets",
		Method:      http.MethodGet,
		Path:        "/budgets",
		Summary:     "List budgets",
		Description: "Get a paginated list of budgets with optional filtering",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, br.List)

	huma.Register(api, huma.Operation{
		OperationID: "create-budget",
		Method:      http.MethodPost,
		Path:        "/budgets",
		Summary:     "Create budget",
		Description: "Create a new budget period",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, br.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-budget",
		Method:      http.MethodGet,
		Path:        "/budgets/{id}",
		Summary:     "Get budget",
		Description: "Get a single budget by ID with calculated actual amount",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, br.Get)

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
	}, br.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-budget",
		Method:      http.MethodDelete,
		Path:        "/budgets/{id}",
		Summary:     "Delete budget",
		Description: "Soft delete a budget",
		Tags:        []string{"Budgets"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, br.Delete)
}

func (br BudgetResource) List(ctx context.Context, input *struct {
	models.BudgetsSearchModel
}) (*struct {
	Body models.BudgetsPagedModel
}, error) {
	resp, err := br.sevs.Budg.GetPaged(ctx, input.BudgetsSearchModel)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.BudgetsPagedModel
	}{Body: resp}, nil
}

func (br BudgetResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget ID"`
}) (*struct {
	Body models.BudgetModel
}, error) {
	item, err := br.sevs.Budg.GetDetail(ctx, input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Budget not found")
	}
	return &struct {
		Body models.BudgetModel
	}{Body: item}, nil
}

func (br BudgetResource) Create(ctx context.Context, input *struct {
	Body models.CreateBudgetModel
}) (*struct {
	Body models.BudgetModel
}, error) {
	resp, err := br.sevs.Budg.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.BudgetModel
	}{Body: resp}, nil
}

func (br BudgetResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Budget ID"`
	Body models.UpdateBudgetModel
}) (*struct {
	Body models.BudgetModel
}, error) {
	resp, err := br.sevs.Budg.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}
	return &struct {
		Body models.BudgetModel
	}{Body: resp}, nil
}

func (br BudgetResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget ID"`
}) (*struct{}, error) {
	if err := br.sevs.Budg.Delete(ctx, input.ID); err != nil {
		return nil, err
	}
	return nil, nil
}
