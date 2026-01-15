package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type TagResource struct {
	ts services.TagService
}

func NewTagResource(ts services.TagService) TagResource {
	return TagResource{ts}
}

func (tr TagResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-tags",
		Method:      "GET",
		Path:        "/tags",
		Summary:     "List tags",
		Description: "Get a paginated list of tags with optional search",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.List)

	huma.Register(api, huma.Operation{
		OperationID: "create-tag",
		Method:      "POST",
		Path:        "/tags",
		Summary:     "Create tag",
		Description: "Create a new tag",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-tag",
		Method:      "GET",
		Path:        "/tags/{id}",
		Summary:     "Get tag",
		Description: "Get a single tag by ID",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-tag",
		Method:      "PATCH",
		Path:        "/tags/{id}",
		Summary:     "Update tag",
		Description: "Update an existing tag",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-tag",
		Method:      "DELETE",
		Path:        "/tags/{id}",
		Summary:     "Delete tag",
		Description: "Delete a tag",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, tr.Delete)
}

func (tr TagResource) List(ctx context.Context, input *struct {
	models.TagsSearchModel
}) (*struct {
	Body models.TagsPagedModel
}, error) {
	resp, err := tr.ts.GetPaged(ctx, input.TagsSearchModel)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.TagsPagedModel
	}{
		Body: resp,
	}, nil
}

func (tr TagResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the tag" example:"1"`
}) (*struct{ Body models.TagModel }, error) {
	resp, err := tr.ts.GetDetail(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &struct{ Body models.TagModel }{
		Body: resp,
	}, nil
}

func (tr TagResource) Create(ctx context.Context, input *struct {
	Body models.CreateTagModel
}) (*struct {
	Body models.TagModel
}, error) {
	resp, err := tr.ts.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.TagModel
	}{
		Body: resp,
	}, nil
}

func (tr TagResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Unique identifier of the tag" example:"1"`
	Body models.UpdateTagModel
}) (*struct {
	Body models.TagModel
}, error) {
	resp, err := tr.ts.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.TagModel
	}{
		Body: resp,
	}, nil
}

func (tr TagResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the tag" example:"1"`
}) (*struct{}, error) {
	err := tr.ts.Delete(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return nil, nil
}
