package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type BudgetTemplateResource struct {
	sevs services.RootService
}

func NewBudgetTemplateResource(sevs services.RootService) BudgetTemplateResource {
	return BudgetTemplateResource{sevs}
}
func (btr BudgetTemplateResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-budget-templates",
		Method:      http.MethodGet,
		Path:        "/budgets",
		Summary:     "List budget templates",
		Description: "Get a paginated list of budget templates",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.GetPaged)
	huma.Register(api, huma.Operation{
		OperationID: "create-budget-template",
		Method:      http.MethodPost,
		Path:        "/budgets",
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
		Path:        "/budgets/{id}",
		Summary:     "Get budget template",
		Description: "Get a single budget template by ID",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.GetDetail)
	huma.Register(api, huma.Operation{
		OperationID: "update-budget-template",
		Method:      http.MethodPatch,
		Path:        "/budgets/{id}",
		Summary:     "Update budget template",
		Description: "Update an existing budget template (name, note, active status only)",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.Update)
	huma.Register(api, huma.Operation{
		OperationID: "list-budget-template-related-budgets",
		Method:      http.MethodGet,
		Path:        "/budgets/{id}/list",
		Summary:     "Get budget template related budgets",
		Description: "Get budgets generated from a budget template with pagination",
		Tags:        []string{"Budget Templates"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, btr.GetRelatedBudgets)
}
func (btr BudgetTemplateResource) GetPaged(ctx context.Context, input *struct {
	models.BudgetTemplatesSearchModel
}) (*struct {
	Body models.BudgetTemplatesPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := btr.sevs.BudgTem.GetPaged(ctx, input.BudgetTemplatesSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.BudgetTemplatesPagedModel
	}{Body: resp}, nil
}
func (btr BudgetTemplateResource) GetDetail(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
}) (*struct {
	Body models.BudgetTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.ID)
	item, err := btr.sevs.BudgTem.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "template_id", input.ID, "error", err)
		return nil, huma.Error404NotFound("Budget template not found")
	}
	logger.Info("start", "template_id", input.ID)
	return &struct {
		Body models.BudgetTemplateModel
	}{Body: item}, nil
}
func (btr BudgetTemplateResource) Create(ctx context.Context, input *struct {
	Body models.CreateBudgetTemplateModel
}) (*struct {
	Body models.BudgetTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start")
	resp, err := btr.sevs.BudgTem.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.BudgetTemplateModel
	}{Body: resp}, nil
}
func (btr BudgetTemplateResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
	Body models.UpdateBudgetTemplateModel
}) (*struct {
	Body models.BudgetTemplateModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.ID)

	// Strict validation: reject any fields outside of name, note, active
	if input.Body == (models.UpdateBudgetTemplateModel{}) {
		logger.Error("validation error", "template_id", input.ID, "reason", "no update fields provided")
		return nil, huma.Error400BadRequest("At least one of name, note, or active must be provided")
	}

	resp, err := btr.sevs.BudgTem.Update(ctx, input.ID, input.Body)
	if err != nil {
		logger.Error("error", "template_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("success", "template_id", input.ID)
	return &struct {
		Body models.BudgetTemplateModel
	}{Body: resp}, nil
}

func (btr BudgetTemplateResource) GetRelatedBudgets(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Budget Template ID"`
	models.BudgetTemplateRelatedBudgetsSearchModel
}) (*struct {
	Body models.BudgetsPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "Resource")
	logger.Info("start", "template_id", input.ID)
	resp, err := btr.sevs.BudgTem.GetRelatedBudgets(ctx, input.ID, input.BudgetTemplateRelatedBudgetsSearchModel)
	if err != nil {
		logger.Error("error", "template_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("success", "template_id", input.ID, "count", len(resp.Items))
	return &struct {
		Body models.BudgetsPagedModel
	}{Body: resp}, nil
}
