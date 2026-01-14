package services

import (
	"context"

	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TagService struct {
	repo repositories.TagRepository
}

func NewTagService(repo repositories.TagRepository) TagService {
	return TagService{repo}
}

// List delegates to repository
func (ts TagService) List(ctx context.Context, query models.ListTagsRequestModel) (models.ListTagsResponseModel, error) {
	return ts.repo.List(ctx, query)
}

// Get delegates to repository
func (ts TagService) Get(ctx context.Context, id int64) (models.TagModel, error) {
	return ts.repo.Get(ctx, id)
}

// Create delegates to repository
func (ts TagService) Create(ctx context.Context, payload models.CreateTagRequestModel) (models.CreateTagResponseModel, error) {
	return ts.repo.Create(ctx, payload)
}

// Update delegates to repository
func (ts TagService) Update(ctx context.Context, id int64, payload models.UpdateTagRequestModel) (models.UpdateTagResponseModel, error) {
	return ts.repo.Update(ctx, id, payload)
}

// Delete delegates to repository
func (ts TagService) Delete(ctx context.Context, id int64) error {
	return ts.repo.Delete(ctx, id)
}
