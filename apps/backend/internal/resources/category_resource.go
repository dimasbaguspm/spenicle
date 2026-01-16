package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type CategoryResource struct {
	cs services.CategoryService
}

func NewCategoryResource(cs services.CategoryService) CategoryResource {
	return CategoryResource{cs}
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
	resp, err := cr.cs.GetPaged(ctx, input.CategoriesSearchModel)
	if err != nil {
		return nil, err
	}

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
	resp, err := cr.cs.GetDetail(ctx, input.ID)
	if err != nil {
		return nil, err
	}

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
	resp, err := cr.cs.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

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
	resp, err := cr.cs.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.CategoryModel
	}{
		Body: resp,
	}, nil
}

func (cr CategoryResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the category" example:"1"`
}) (*struct{}, error) {
	err := cr.cs.Delete(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}

func (cr CategoryResource) Reorder(ctx context.Context, input *struct {
	Body models.ReorderCategoriesRequestModel
}) (*struct{}, error) {
	err := cr.cs.Reorder(ctx, input.Body.Data)
	if err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}
