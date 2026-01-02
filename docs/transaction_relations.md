# Transaction Relations Feature

## Overview

The transaction relations feature allows linking transactions together, similar to Jira's related issues feature. This enables tracking relationships between transactions (e.g., a payment transaction related to an invoice transaction, refund related to original purchase, etc.).

## Database Schema

### Table: `transaction_relations`

```sql
CREATE TABLE transaction_relations (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    related_transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, related_transaction_id),
    CONSTRAINT no_self_relation CHECK (transaction_id != related_transaction_id)
);
```

**Key Features:**

- Prevents duplicate relations with UNIQUE constraint
- Prevents self-relations with CHECK constraint
- Automatically deletes relations when either transaction is deleted (CASCADE)
- Indexed on both transaction IDs for fast lookups

## API Endpoints

All endpoints follow RESTful conventions and always return full transaction details.

### 1. List Related Transactions

```http
GET /transactions/{id}/relations
```

Returns full details of all related transactions for a given transaction.

**Response:** (200 OK)

```json
[
  {
    "id": 2,
    "type": "income",
    "date": "2026-01-01T00:00:00Z",
    "amount": 30000,
    "accountId": 1,
    "categoryId": 2,
    "destinationAccountId": null,
    "note": "Payment received",
    "createdAt": "2026-01-02T10:00:00Z",
    "updatedAt": "2026-01-02T10:00:00Z",
    "deletedAt": null
  }
]
```

**Error Responses:**

- 404 if source transaction not found

### 2. Create Relation

```http
POST /transactions/{id}/relations
```

Creates a new relation between two transactions.

**Request Body:**

```json
{
  "relatedTransactionId": 2
}
```

**Response:** (201 Created)

```json
{
  "id": 1,
  "transactionId": 1,
  "relatedTransactionId": 2,
  "createdAt": "2026-01-02T10:00:00Z"
}
```

**Validations:**

- Both transactions must exist and not be deleted
- Cannot relate a transaction to itself
- Cannot create duplicate relations

**Error Responses:**

- 404 if either transaction not found
- 400 if trying to relate transaction to itself
- 409 if relation already exists

### 3. Get Single Related Transaction

```http
GET /transactions/{id}/relations/{relatedId}
```

Returns full details of a specific related transaction.

**Response:** (200 OK)

```json
{
  "id": 2,
  "type": "income",
  "date": "2026-01-01T00:00:00Z",
  "amount": 30000,
  "accountId": 1,
  "categoryId": 2,
  "destinationAccountId": null,
  "note": "Payment received",
  "createdAt": "2026-01-02T10:00:00Z",
  "updatedAt": "2026-01-02T10:00:00Z",
  "deletedAt": null
}
```

**Error Responses:**

- 404 if source transaction not found
- 404 if related transaction not found
- 404 if relation doesn't exist

### 4. Delete Relation

```http
DELETE /transactions/{id}/relations/{relatedId}
```

Removes the relation between two transactions. The transactions themselves are not deleted.

**Response:** (204 No Content)

**Error Responses:**

- 404 if relation not found

## Architecture

### Repository Layer

`TransactionRelationRepository` handles:

- CRUD operations for relations
- Fetching related transaction details with JOIN queries
- Checking relation existence
- Enforcing uniqueness and validation at DB level

### Service Layer

`TransactionRelationService` handles:

- Business validation (transactions exist, not deleted)
- Verifying relation existence for GET operations
- Coordinating between relation and transaction stores

### Resource Layer

`TransactionRelationResource` provides:

- RESTful API endpoints
- Request/response transformation
- HTTP error handling
- API documentation via Huma

## Use Cases

1. **Linking refund to original purchase**

   - Create relation from refund transaction to original transaction
   - Easily track which refund belongs to which purchase

2. **Tracking payment sequences**

   - Link partial payments to main invoice
   - View all related payments for an invoice

3. **Connecting split transactions**

   - When splitting a transaction into multiple parts
   - Relate all parts together for tracking

4. **Recording reimbursements**
   - Link expense to reimbursement income
   - Track which expenses have been reimbursed

## Design Decisions

### Unidirectional vs Bidirectional

- Relations are **unidirectional** (A → B doesn't automatically create B → A)
- This gives more flexibility - can create bidirectional manually if needed
- Simpler to understand and implement
- Matches the "relates to" semantic better than forced bidirectionality

### Cascade Deletion

- When a transaction is deleted, all its relations are automatically deleted
- This prevents orphaned relations
- Ensures referential integrity

### No Relation Types (Yet)

- Current implementation doesn't have relation types ("caused by", "implements", etc.)
- Can be added later if needed by adding a `relation_type` column
- Keeps the initial implementation simple

## Testing

All existing tests pass. The implementation follows the same patterns as other features:

- Repository layer for data access
- Service layer for business logic
- Resource layer for HTTP handling
- Full integration with existing transaction validation

## Migration

Run the migration to add the `transaction_relations` table:

```bash
# Migration will be applied with docker-compose up or manually
```

Migration file: `000003_add_transaction_relations.up.sql`
