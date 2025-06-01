import { Router } from 'express';

import { getSummary } from '../controllers/index.ts';

const router = Router();

/**
 * @swagger
 * /summary:
 *   get:
 *     summary: Get financial summary
 *     description: Retrieve a comprehensive financial summary including income, expenses, and balance for the user's group
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for summary period with timezone support (ISO 8601)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for summary period with timezone support (ISO 8601)
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Filter by specific account ID
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by specific category ID
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalIncome:
 *                       type: number
 *                       format: decimal
 *                       description: Total income for the period
 *                       example: 5000.00
 *                     totalExpenses:
 *                       type: number
 *                       format: decimal
 *                       description: Total expenses for the period
 *                       example: 3500.00
 *                     netIncome:
 *                       type: number
 *                       format: decimal
 *                       description: Net income (income - expenses)
 *                       example: 1500.00
 *                     accountBalances:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           accountId:
 *                             type: string
 *                           accountName:
 *                             type: string
 *                           balance:
 *                             type: number
 *                             format: decimal
 *                     categoryBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoryId:
 *                             type: string
 *                           categoryName:
 *                             type: string
 *                           amount:
 *                             type: number
 *                             format: decimal
 *                           type:
 *                             type: string
 *                             enum: [income, expense]
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - invalid date format or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing token
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
router.get('/', getSummary);

export default router;
