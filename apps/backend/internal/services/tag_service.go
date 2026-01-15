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

func (ts TagService) GetPaged(ctx context.Context, query models.TagsSearchModel) (models.TagsPagedModel, error) {
	return ts.repo.GetPaged(ctx, query)
}

func (ts TagService) GetDetail(ctx context.Context, id int64) (models.TagModel, error) {
	return ts.repo.GetDetail(ctx, id)
}

func (ts TagService) Create(ctx context.Context, payload models.CreateTagModel) (models.TagModel, error) {
	return ts.repo.Create(ctx, payload)
}

func (ts TagService) Update(ctx context.Context, id int64, payload models.UpdateTagModel) (models.TagModel, error) {
	return ts.repo.Update(ctx, id, payload)
}

func (ts TagService) Delete(ctx context.Context, id int64) error {
	return ts.repo.Delete(ctx, id)
}
