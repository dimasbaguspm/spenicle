import { Router } from 'express';

import {
  getSummaryCategoriesPeriod,
  getSummaryAccountsPeriod,
  getSummaryTransactionsPeriod,
} from '../controllers/index.ts';

const router = Router();

/**
 * @swagger
 * /summary/categories-period:
 *   get:
 *     summary: Get category summary for a period
 *     description: Retrieve aggregated income, expenses, and net per category for a given period
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: End date (ISO 8601)
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by account ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by category ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [totalIncome, totalExpenses, totalNet, netAmount]
 *         required: false
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Category period summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryCategoriesPeriod'
 */
router.get('/categories-period', getSummaryCategoriesPeriod);

/**
 * @swagger
 * /summary/accounts-period:
 *   get:
 *     summary: Get account summary for a period
 *     description: Retrieve aggregated income, expenses, and net per account for a given period
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: End date (ISO 8601)
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by account ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by category ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [totalIncome, totalExpenses, totalNet, netAmount]
 *         required: false
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Account period summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryAccountsPeriod'
 */
router.get('/accounts-period', getSummaryAccountsPeriod);

/**
 * @swagger
 * /summary/transactions-period:
 *   get:
 *     summary: Get transaction summary grouped by interval
 *     description: Retrieve aggregated income, expenses, and net grouped by week for a given period
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: End date (ISO 8601)
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by account ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by category ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [totalIncome, totalExpenses, totalNet, netAmount]
 *         required: false
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         required: false
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Transaction period summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryTransactionsPeriod'
 */
router.get('/transactions-period', getSummaryTransactionsPeriod);

export default router;
