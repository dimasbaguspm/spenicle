package resources

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type TagResource struct {
	tagService *services.TagService
}

func NewTagResource(tagService *services.TagService) *TagResource {
	return &TagResource{
		tagService: tagService,
	}
}

func (r *TagResource) RegisterRoutes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-tags",
		Method:      http.MethodGet,
		Path:        "/tags",
		Summary:     "List tags",
		Description: "Get a paginated list of tags with optional search",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.ListTags)

	huma.Register(api, huma.Operation{
		OperationID: "create-tag",
		Method:      http.MethodPost,
		Path:        "/tags",
		Summary:     "Create tag",
		Description: "Create a new tag",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.CreateTag)

	huma.Register(api, huma.Operation{
		OperationID: "delete-tag",
		Method:      http.MethodDelete,
		Path:        "/tags/{id}",
		Summary:     "Delete tag",
		Description: "Delete a tag by ID",
		Tags:        []string{"Tags"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, r.DeleteTag)
}

// ListTags handles GET /tags
func (r *TagResource) ListTags(ctx context.Context, input *struct {
	schemas.SearchParamTagSchema
}) (*struct {
	Body schemas.PaginatedTagSchema
}, error) {
	data, err := r.tagService.ListTags(ctx, input.SearchParamTagSchema)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to list tags", err)
	}

	return &struct {
		Body schemas.PaginatedTagSchema
	}{Body: data}, nil
}

// CreateTag handles POST /tags
func (r *TagResource) CreateTag(ctx context.Context, input *struct {
	Body schemas.CreateTagSchema
}) (*struct {
	Status int
	Body   schemas.TagSchema
}, error) {
	tag, err := r.tagService.CreateTag(ctx, input.Body)
	if err != nil {
		if err.Error() == "tag already exists" {
			return nil, huma.Error409Conflict("Tag already exists")
		}
		if err.Error() == "tag name is required" || err.Error() == "tag name must be 50 characters or less" {
			return nil, huma.Error400BadRequest(err.Error())
		}
		return nil, huma.Error500InternalServerError("Failed to create tag", err)
	}

	return &struct {
		Status int
		Body   schemas.TagSchema
	}{
		Status: http.StatusCreated,
		Body:   tag,
	}, nil
}

// DeleteTag handles DELETE /tags/:id
func (r *TagResource) DeleteTag(ctx context.Context, input *struct {
	schemas.DeleteTagInput
}) (*struct{}, error) {
	err := r.tagService.DeleteTag(ctx, input.ID)
	if err != nil {
		if err.Error() == "tag not found" {
			return nil, huma.Error404NotFound("Tag not found")
		}
		return nil, huma.Error500InternalServerError("Failed to delete tag", err)
	}

	return &struct{}{}, nil
}
