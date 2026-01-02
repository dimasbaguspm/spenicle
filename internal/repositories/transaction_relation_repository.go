package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle-api/internal/database/schemas"
)

var (
	ErrTransactionRelationNotFound      = errors.New("transaction relation not found")
	ErrTransactionRelationAlreadyExists = errors.New("transaction relation already exists")
	ErrCannotRelateSameTransaction      = errors.New("cannot relate a transaction to itself")
)

type TransactionRelationRepository struct {
	db DB
}

func NewTransactionRelationRepository(db DB) *TransactionRelationRepository {
	return &TransactionRelationRepository{db: db}
}

// List returns all relations for a given transaction ID
func (r *TransactionRelationRepository) List(ctx context.Context, transactionID int) ([]schemas.TransactionRelationSchema, error) {
	sql := `SELECT id, transaction_id, related_transaction_id, created_at
	        FROM transaction_relations 
	        WHERE transaction_id = $1
	        ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, sql, transactionID)
	if err != nil {
		return nil, fmt.Errorf("query transaction relations: %w", err)
	}
	defer rows.Close()

	var relations []schemas.TransactionRelationSchema
	for rows.Next() {
		var relation schemas.TransactionRelationSchema
		if err := rows.Scan(
			&relation.ID,
			&relation.TransactionID,
			&relation.RelatedTransactionID,
			&relation.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan transaction relation: %w", err)
		}
		relations = append(relations, relation)
	}

	return relations, nil
}

// GetRelatedTransactions returns the full transaction details for all related transactions
func (r *TransactionRelationRepository) GetRelatedTransactions(ctx context.Context, transactionID int) ([]schemas.TransactionSchema, error) {
	sql := `SELECT t.id, t.type, t.date, t.amount, t.account_id, t.category_id, t.destination_account_id, 
	               t.note, t.created_at, t.updated_at, t.deleted_at
	        FROM transactions t
	        INNER JOIN transaction_relations tr ON t.id = tr.related_transaction_id
	        WHERE tr.transaction_id = $1 AND t.deleted_at IS NULL
	        ORDER BY t.date DESC, t.created_at DESC`

	rows, err := r.db.Query(ctx, sql, transactionID)
	if err != nil {
		return nil, fmt.Errorf("query related transactions: %w", err)
	}
	defer rows.Close()

	var transactions []schemas.TransactionSchema
	for rows.Next() {
		var transaction schemas.TransactionSchema
		if err := rows.Scan(
			&transaction.ID,
			&transaction.Type,
			&transaction.Date,
			&transaction.Amount,
			&transaction.AccountID,
			&transaction.CategoryID,
			&transaction.DestinationAccountID,
			&transaction.Note,
			&transaction.CreatedAt,
			&transaction.UpdatedAt,
			&transaction.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan related transaction: %w", err)
		}
		transactions = append(transactions, transaction)
	}

	return transactions, nil
}

// Create adds a new relation between two transactions
func (r *TransactionRelationRepository) Create(ctx context.Context, input schemas.CreateTransactionRelationSchema) (schemas.TransactionRelationSchema, error) {
	// Validate not relating to itself
	if input.TransactionID == input.RelatedTransactionID {
		return schemas.TransactionRelationSchema{}, ErrCannotRelateSameTransaction
	}

	sql := `INSERT INTO transaction_relations (transaction_id, related_transaction_id) 
	        VALUES ($1, $2) 
	        RETURNING id, transaction_id, related_transaction_id, created_at`

	var relation schemas.TransactionRelationSchema
	err := r.db.QueryRow(ctx, sql, input.TransactionID, input.RelatedTransactionID).Scan(
		&relation.ID,
		&relation.TransactionID,
		&relation.RelatedTransactionID,
		&relation.CreatedAt,
	)

	if err != nil {
		// Check for unique constraint violation
		if err.Error() == "duplicate key value violates unique constraint \"transaction_relations_transaction_id_related_transaction_id_key\"" {
			return schemas.TransactionRelationSchema{}, ErrTransactionRelationAlreadyExists
		}
		return schemas.TransactionRelationSchema{}, fmt.Errorf("create transaction relation: %w", err)
	}

	return relation, nil
}

// Delete removes a relation between two transactions
func (r *TransactionRelationRepository) Delete(ctx context.Context, transactionID, relatedTransactionID int) error {
	sql := `DELETE FROM transaction_relations 
	        WHERE transaction_id = $1 AND related_transaction_id = $2`

	tag, err := r.db.Exec(ctx, sql, transactionID, relatedTransactionID)
	if err != nil {
		return fmt.Errorf("delete transaction relation: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrTransactionRelationNotFound
	}

	return nil
}

// DeleteByID removes a relation by its ID
func (r *TransactionRelationRepository) DeleteByID(ctx context.Context, id int) error {
	sql := `DELETE FROM transaction_relations WHERE id = $1`

	tag, err := r.db.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("delete transaction relation by id: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrTransactionRelationNotFound
	}

	return nil
}

// Exists checks if a relation exists between two transactions
func (r *TransactionRelationRepository) Exists(ctx context.Context, transactionID, relatedTransactionID int) (bool, error) {
	sql := `SELECT EXISTS(
		SELECT 1 FROM transaction_relations 
		WHERE transaction_id = $1 AND related_transaction_id = $2
	)`

	var exists bool
	err := r.db.QueryRow(ctx, sql, transactionID, relatedTransactionID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check transaction relation exists: %w", err)
	}

	return exists, nil
}
