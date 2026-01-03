package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TagService struct {
	tagRepo *repositories.TagRepository
}

func NewTagService(tagRepo *repositories.TagRepository) *TagService {
	return &TagService{
		tagRepo: tagRepo,
	}
}

// ListTags returns paginated tags with optional search
func (s *TagService) ListTags(ctx context.Context, params schemas.SearchParamTagSchema) (schemas.PaginatedTagSchema, error) {
	return s.tagRepo.List(ctx, params)
}

// CreateTag creates a new tag with validation
func (s *TagService) CreateTag(ctx context.Context, input schemas.CreateTagSchema) (schemas.TagSchema, error) {
	// Validate name
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return schemas.TagSchema{}, errors.New("tag name is required")
	}

	if len(name) > 50 {
		return schemas.TagSchema{}, errors.New("tag name must be 50 characters or less")
	}

	// Normalize name (lowercase for uniqueness check)
	normalizedInput := schemas.CreateTagSchema{
		Name: strings.ToLower(name),
	}

	// Check if tag already exists
	existing, err := s.tagRepo.GetByName(ctx, normalizedInput.Name)
	if err == nil && existing.ID > 0 {
		return schemas.TagSchema{}, errors.New("tag already exists")
	}

	// Only allow specific errors to pass (not found is ok)
	if err != nil && !errors.Is(err, sql.ErrNoRows) && !strings.Contains(err.Error(), "no rows") {
		return schemas.TagSchema{}, fmt.Errorf("check existing tag: %w", err)
	}

	// Create the tag
	return s.tagRepo.Create(ctx, normalizedInput)
}

// DeleteTag deletes a tag by ID
func (s *TagService) DeleteTag(ctx context.Context, id int) error {
	// Check if tag exists
	_, err := s.tagRepo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			return errors.New("tag not found")
		}
		return fmt.Errorf("get tag: %w", err)
	}

	// Delete the tag (cascade will remove from transaction_tags)
	return s.tagRepo.Delete(ctx, id)
}
