package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type CategoryResource struct {
	sevs services.RootService
}

func NewCategoryResource(sevs services.RootService) CategoryResource {
	return CategoryResource{sevs}
}
func (cr CategoryResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-categories",
		Method:      "GET",
		Path:        "/categories",
		Summary:     "List categories",
		Description: "Get a paginated list of categories with optional search",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.List)
	huma.Register(api, huma.Operation{
		OperationID: "create-category",
		Method:      "POST",
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
		Method:      "GET",
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
		Method:      "PATCH",
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
		Method:      "DELETE",
		Path:        "/categories/{id}",
		Summary:     "Delete category",
		Description: "Delete a category",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Delete)
	huma.Register(api, huma.Operation{
		OperationID: "reorder-categories",
		Method:      "POST",
		Path:        "/categories/reorder",
		Summary:     "Reorder categories",
		Description: "Update display order for multiple categories",
		Tags:        []string{"Categories"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, cr.Reorder)
}
func (cr CategoryResource) List(ctx context.Context, input *struct {
	models.CategoriesSearchModel
}) (*struct {
	Body models.CategoriesPagedModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Reorder")
	logger.Info("start")
	resp, err := cr.sevs.Cat.GetPaged(ctx, input.CategoriesSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct {
		Body models.CategoriesPagedModel
	}{
		Body: resp,
	}, nil
}
func (cr CategoryResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the category" example:"1"`
}) (*struct {
	Body models.CategoryModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Get", "category_id", input.ID)
	logger.Info("start")
	resp, err := cr.sevs.Cat.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct {
		Body models.CategoryModel
	}{
		Body: resp,
	}, nil
}
func (cr CategoryResource) Create(ctx context.Context, input *struct {
	Body models.CreateCategoryModel
}) (*struct {
	Body models.CategoryModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Reorder")
	logger.Info("start")
	resp, err := cr.sevs.Cat.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct {
		Body models.CategoryModel
	}{
		Body: resp,
	}, nil
}
func (cr CategoryResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Unique identifier of the category" example:"1"`
	Body models.UpdateCategoryModel
}) (*struct {
	Body models.CategoryModel
}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Reorder")
	logger.Info("start", "category_id", input.ID)
	resp, err := cr.sevs.Cat.Update(ctx, input.ID, input.Body)
	if err != nil {
		logger.Error("error", "category_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("start", "category_id", input.ID)
	return &struct {
		Body models.CategoryModel
	}{
		Body: resp,
	}, nil
}
func (cr CategoryResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the category" example:"1"`
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Reorder")
	logger.Info("start", "category_id", input.ID)
	err := cr.sevs.Cat.Delete(ctx, input.ID)
	if err != nil {
		logger.Error("error", "category_id", input.ID, "error", err)
		return nil, err
	}
	logger.Info("start", "category_id", input.ID)
	return &struct{}{}, nil
}
func (cr CategoryResource) Reorder(ctx context.Context, input *struct {
	Body models.ReorderCategoriesModel
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "CategoryResource.Reorder")
	logger.Info("start")
	err := cr.sevs.Cat.Reorder(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("start")
	return &struct{}{}, nil
}
