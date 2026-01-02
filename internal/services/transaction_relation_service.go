package services

import (
	"context"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type TransactionRelationStore interface {
	List(ctx context.Context, transactionID int) ([]schemas.TransactionRelationSchema, error)
	GetRelatedTransactions(ctx context.Context, transactionID int) ([]schemas.TransactionSchema, error)
	Create(ctx context.Context, input schemas.CreateTransactionRelationSchema) (schemas.TransactionRelationSchema, error)
	Delete(ctx context.Context, transactionID, relatedTransactionID int) error
	DeleteByID(ctx context.Context, id int) error
	Exists(ctx context.Context, transactionID, relatedTransactionID int) (bool, error)
}

type TransactionGetter interface {
	Get(ctx context.Context, id int) (schemas.TransactionSchema, error)
}

type TransactionRelationService struct {
	relationStore    TransactionRelationStore
	transactionStore TransactionGetter
}

func NewTransactionRelationService(
	relationStore TransactionRelationStore,
	transactionStore TransactionGetter,
) *TransactionRelationService {
	return &TransactionRelationService{
		relationStore:    relationStore,
		transactionStore: transactionStore,
	}
}

// ListRelations returns all relations for a transaction
func (s *TransactionRelationService) ListRelations(ctx context.Context, transactionID int) ([]schemas.TransactionRelationSchema, error) {
	// Verify transaction exists
	if _, err := s.transactionStore.Get(ctx, transactionID); err != nil {
		return nil, err
	}

	return s.relationStore.List(ctx, transactionID)
}

// GetRelatedTransactions returns the full details of all related transactions
func (s *TransactionRelationService) GetRelatedTransactions(ctx context.Context, transactionID int) ([]schemas.TransactionSchema, error) {
	// Verify transaction exists
	if _, err := s.transactionStore.Get(ctx, transactionID); err != nil {
		return nil, err
	}

	return s.relationStore.GetRelatedTransactions(ctx, transactionID)
}

// GetRelatedTransaction returns a single related transaction by ID
func (s *TransactionRelationService) GetRelatedTransaction(ctx context.Context, transactionID, relatedTransactionID int) (schemas.TransactionSchema, error) {
	// Verify source transaction exists
	if _, err := s.transactionStore.Get(ctx, transactionID); err != nil {
		return schemas.TransactionSchema{}, err
	}

	// Verify relation exists
	exists, err := s.relationStore.Exists(ctx, transactionID, relatedTransactionID)
	if err != nil {
		return schemas.TransactionSchema{}, fmt.Errorf("check relation exists: %w", err)
	}
	if !exists {
		return schemas.TransactionSchema{}, repositories.ErrTransactionRelationNotFound
	}

	// Get the related transaction
	return s.transactionStore.Get(ctx, relatedTransactionID)
}

// Create adds a relation between two transactions
// Validates that both transactions exist and are not deleted
func (s *TransactionRelationService) Create(ctx context.Context, input schemas.CreateTransactionRelationSchema) (schemas.TransactionRelationSchema, error) {
	// Validate source transaction exists
	if _, err := s.transactionStore.Get(ctx, input.TransactionID); err != nil {
		return schemas.TransactionRelationSchema{}, fmt.Errorf("source transaction: %w", err)
	}

	// Validate related transaction exists
	if _, err := s.transactionStore.Get(ctx, input.RelatedTransactionID); err != nil {
		return schemas.TransactionRelationSchema{}, fmt.Errorf("related transaction: %w", err)
	}

	// Validate not relating to itself (double-check, repository also validates)
	if input.TransactionID == input.RelatedTransactionID {
		return schemas.TransactionRelationSchema{}, repositories.ErrCannotRelateSameTransaction
	}

	// Create the relation
	return s.relationStore.Create(ctx, input)
}

// Delete removes a relation between two transactions
func (s *TransactionRelationService) Delete(ctx context.Context, transactionID, relatedTransactionID int) error {
	return s.relationStore.Delete(ctx, transactionID, relatedTransactionID)
}

// DeleteByID removes a relation by its ID
func (s *TransactionRelationService) DeleteByID(ctx context.Context, id int) error {
	return s.relationStore.DeleteByID(ctx, id)
}
