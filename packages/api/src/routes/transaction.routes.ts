import { Router } from 'express';

import {
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/index.ts';

import transactionRecurrenceRoutes from './transaction-recurrence.routes.ts';

const router = Router();

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: List all transactions
 *     description: Retrieve all transactions for the authenticated user's group with optional filtering, pagination, and sorting
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: ids
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: Filter by multiple transaction IDs (comma-separated)
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: Filter by group ID
 *       - in: query
 *         name: accountIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: Filter by multiple account IDs (comma-separated)
 *       - in: query
 *         name: categoryIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: false
 *         description: Filter by multiple category IDs (comma-separated)
 *       - in: query
 *         name: createdByUserId
 *         schema:
 *           type: integer
 *         description: Filter by user who created the transaction
 *       - in: query
 *         name: note
 *         schema:
 *           type: string
 *         description: Search in transaction notes
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions from this date with timezone support
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions until this date with timezone support
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 3
 *         description: Filter by currency code
 *       - in: query
 *         name: types
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           enum: [expense, income, transfer]
 *         style: form
 *         explode: false
 *         description: Filter by transaction types (comma-separated)
 *       - in: query
 *         name: recurrenceId
 *         schema:
 *           type: integer
 *         description: Filter by recurrence ID
 *       - in: query
 *         name: isHighlighted
 *         schema:
 *           type: boolean
 *         description: Filter by highlighted status
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PagedTransactions'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new transaction
 *     description: Create a new transaction for the authenticated user's group
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewTransaction'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Transaction routes
router.get('/', listTransactions);
router.post('/', createTransaction);

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     description: Retrieve a specific transaction by its ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update transaction
 *     description: Update transaction details
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTransaction'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete transaction
 *     description: Delete a transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       204:
 *         description: Transaction deleted successfully
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Mount transaction recurrence routes
router.use('/:transactionId/recurrence', transactionRecurrenceRoutes);

export default router;
