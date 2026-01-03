package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
	"github.com/dimasbaguspm/spenicle-api/internal/utils"
)

type CategoryStore interface {
	List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error)
	Get(ctx context.Context, id int64) (schemas.CategorySchema, error)
	Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error)
	Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error)
	Delete(ctx context.Context, id int64) error
	Reorder(ctx context.Context, items []schemas.CategoryReorderItemSchema) error
}

type CategoryService struct {
	store CategoryStore
}

func NewCategoryService(store CategoryStore) *CategoryService {
	return &CategoryService{store: store}
}

func (s *CategoryService) List(ctx context.Context, params schemas.SearchParamCategorySchema) (schemas.PaginatedCategorySchema, error) {
	maxPageSize := 100
	defaultPageSize := 10

	// Enforce maximum page size (performance constraint)
	if params.PageSize > maxPageSize {
		params.PageSize = maxPageSize
	}
	if params.PageSize <= 0 {
		params.PageSize = defaultPageSize
	}

	// Ensure valid page number
	if params.PageNumber <= 0 {
		params.PageNumber = 1
	}

	return s.store.List(ctx, params)
}

// Get retrieves a single category by ID.
func (s *CategoryService) Get(ctx context.Context, id int64) (schemas.CategorySchema, error) {
	category, err := s.store.Get(ctx, id)
	if err != nil {
		return schemas.CategorySchema{}, fmt.Errorf("failed to get category: %w", err)
	}
	return category, nil
}

// Create validates and creates a new category.
func (s *CategoryService) Create(ctx context.Context, data schemas.CreateCategorySchema) (schemas.CategorySchema, error) {
	data.Name = utils.SanitizeString(data.Name)
	data.Note = utils.SanitizeString(data.Note)

	// Validate sanitized name is not empty after sanitization
	if data.Name == "" {
		return schemas.CategorySchema{}, errors.New("name cannot be empty after sanitization")
	}

	category, err := s.store.Create(ctx, data)
	if err != nil {
		return schemas.CategorySchema{}, fmt.Errorf("failed to create category: %w", err)
	}
	return category, nil
}

// Update validates and updates an existing category.
func (s *CategoryService) Update(ctx context.Context, id int64, data schemas.UpdateCategorySchema) (schemas.CategorySchema, error) {
	if data.Name == nil && data.Type == nil && data.Note == nil && data.Icon == nil && data.IconColor == nil && data.ArchivedAt == nil {
		return schemas.CategorySchema{}, repositories.ErrNoFieldsToUpdate
	}

	data.Name = utils.SanitizeStringPtr(data.Name)
	data.Note = utils.SanitizeStringPtr(data.Note)

	// Validate name is not empty after sanitization (if provided)
	if data.Name != nil && *data.Name == "" {
		return schemas.CategorySchema{}, errors.New("name cannot be empty after sanitization")
	}

	category, err := s.store.Update(ctx, id, data)
	if err != nil {
		if errors.Is(err, repositories.ErrCategoryNotFound) {
			return schemas.CategorySchema{}, repositories.ErrCategoryNotFound
		}
		return schemas.CategorySchema{}, fmt.Errorf("failed to update category: %w", err)
	}
	return category, nil
}

// Delete soft-deletes a category.
func (s *CategoryService) Delete(ctx context.Context, id int64) error {
	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}
	return nil
}

// Reorder atomically updates the display order for multiple categories.
func (s *CategoryService) Reorder(ctx context.Context, data schemas.CategoryReorderSchema) error {
	if len(data.Items) == 0 {
		return errors.New("at least one category must be provided for reordering")
	}

	// Validate that all IDs are unique
	seen := make(map[int64]bool)
	for _, item := range data.Items {
		if seen[item.ID] {
			return fmt.Errorf("duplicate category ID: %d", item.ID)
		}
		seen[item.ID] = true
	}

	if err := s.store.Reorder(ctx, data.Items); err != nil {
		return fmt.Errorf("failed to reorder categories: %w", err)
	}
	return nil
}
