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

type TransactionTagService struct {
	transactionTagRepo *repositories.TransactionTagRepository
	transactionRepo    *repositories.TransactionRepository
	tagRepo            *repositories.TagRepository
}

func NewTransactionTagService(
	transactionTagRepo *repositories.TransactionTagRepository,
	transactionRepo *repositories.TransactionRepository,
	tagRepo *repositories.TagRepository,
) *TransactionTagService {
	return &TransactionTagService{
		transactionTagRepo: transactionTagRepo,
		transactionRepo:    transactionRepo,
		tagRepo:            tagRepo,
	}
}

// GetTransactionTags returns all tags for a transaction
func (s *TransactionTagService) GetTransactionTags(ctx context.Context, transactionID int) (schemas.TransactionTagsSchema, error) {
	// Verify transaction exists
	_, err := s.transactionRepo.Get(ctx, transactionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			return schemas.TransactionTagsSchema{}, errors.New("transaction not found")
		}
		return schemas.TransactionTagsSchema{}, fmt.Errorf("get transaction: %w", err)
	}

	tags, err := s.transactionTagRepo.GetTransactionTags(ctx, transactionID)
	if err != nil {
		return schemas.TransactionTagsSchema{}, fmt.Errorf("get transaction tags: %w", err)
	}

	return schemas.TransactionTagsSchema{Tags: tags}, nil
}

// AddTagToTransaction adds a tag to a transaction
func (s *TransactionTagService) AddTagToTransaction(ctx context.Context, transactionID int, input schemas.AddTransactionTagSchema) error {
	// Verify transaction exists
	_, err := s.transactionRepo.Get(ctx, transactionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			return errors.New("transaction not found")
		}
		return fmt.Errorf("get transaction: %w", err)
	}

	// Get or create tag
	tagName := strings.TrimSpace(input.TagName)
	if tagName == "" {
		return errors.New("tag name is required")
	}

	normalizedName := strings.ToLower(tagName)
	tag, err := s.tagRepo.GetByName(ctx, normalizedName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			// Tag doesn't exist, create it
			createInput := schemas.CreateTagSchema{Name: normalizedName}
			tag, err = s.tagRepo.Create(ctx, createInput)
			if err != nil {
				return fmt.Errorf("create tag: %w", err)
			}
		} else {
			return fmt.Errorf("get tag: %w", err)
		}
	}

	// Add tag to transaction
	return s.transactionTagRepo.AddTagToTransaction(ctx, transactionID, tag.ID)
}

// UpdateTransactionTags replaces all tags for a transaction
func (s *TransactionTagService) UpdateTransactionTags(ctx context.Context, transactionID int, input schemas.UpdateTransactionTagsSchema) error {
	// Verify transaction exists
	_, err := s.transactionRepo.Get(ctx, transactionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			return errors.New("transaction not found")
		}
		return fmt.Errorf("get transaction: %w", err)
	}

	// Resolve all tag names to IDs (create if needed)
	tagIDs := make([]int, 0, len(input.TagNames))
	for _, tagName := range input.TagNames {
		normalizedName := strings.ToLower(strings.TrimSpace(tagName))
		if normalizedName == "" {
			continue
		}

		tag, err := s.tagRepo.GetByName(ctx, normalizedName)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
				// Create new tag
				createInput := schemas.CreateTagSchema{Name: normalizedName}
				tag, err = s.tagRepo.Create(ctx, createInput)
				if err != nil {
					return fmt.Errorf("create tag %s: %w", normalizedName, err)
				}
			} else {
				return fmt.Errorf("get tag %s: %w", normalizedName, err)
			}
		}

		tagIDs = append(tagIDs, tag.ID)
	}

	// Update transaction tags
	return s.transactionTagRepo.ReplaceTransactionTags(ctx, transactionID, tagIDs)
}
