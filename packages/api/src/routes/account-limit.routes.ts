import { Router } from 'express';

import {
  listAccountLimits,
  createAccountLimit,
  getAccountLimit,
  updateAccountLimit,
  deleteAccountLimit,
} from '../controllers/index.ts';

const router = Router({ mergeParams: true }); // mergeParams allows access to parent router params

/**
 * @swagger
 * /accounts/{accountId}/limits:
 *   get:
 *     summary: List account limits
 *     description: Get all spending limits for a specific account with optional filtering, pagination, and sorting
 *     tags: [Account Limits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: Filter by limit ID
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: Filter by group ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *         description: Filter by limit period
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
 *           enum: [period, limit, createdAt]
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
 *         description: Paginated list of account limits
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PagedAccountLimits'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user not authorized to access account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account not found
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
router.get('/', listAccountLimits);

/**
 * @swagger
 * /accounts/{accountId}/limits:
 *   post:
 *     summary: Create account limit
 *     description: Create a new spending limit for an account
 *     tags: [Account Limits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewAccountLimit'
 *     responses:
 *       201:
 *         description: Account limit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account limit created successfully"
 *                 limit:
 *                   $ref: '#/components/schemas/AccountLimit'
 *       400:
 *         description: Bad request - validation errors
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
 *       403:
 *         description: Forbidden - user not authorized to modify account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account not found
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
router.post('/', createAccountLimit);

/**
 * @swagger
 * /accounts/{accountId}/limits/{limitId}:
 *   get:
 *     summary: Get account limit
 *     description: Retrieve a specific account limit
 *     tags: [Account Limits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *       - in: path
 *         name: limitId
 *         required: true
 *         schema:
 *           type: string
 *         description: Limit ID
 *     responses:
 *       200:
 *         description: Account limit retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 limit:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     amount:
 *                       type: number
 *                       format: decimal
 *                     period:
 *                       type: string
 *                     accountId:
 *                       type: string
 *                     groupId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user not authorized to access account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account or limit not found
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
router.get('/:limitId', getAccountLimit);

/**
 * @swagger
 * /accounts/{accountId}/limits/{limitId}:
 *   patch:
 *     summary: Update account limit
 *     description: Update a specific account limit
 *     tags: [Account Limits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *       - in: path
 *         name: limitId
 *         required: true
 *         schema:
 *           type: string
 *         description: Limit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAccountLimit'
 *     responses:
 *       200:
 *         description: Account limit updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account limit updated successfully"
 *                 limit:
 *                   $ref: '#/components/schemas/AccountLimit'
 *       400:
 *         description: Bad request - validation errors
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
 *       403:
 *         description: Forbidden - user not authorized to modify account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account or limit not found
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
router.patch('/:limitId', updateAccountLimit);

/**
 * @swagger
 * /accounts/{accountId}/limits/{limitId}:
 *   delete:
 *     summary: Delete account limit
 *     description: Delete a specific account limit
 *     tags: [Account Limits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *       - in: path
 *         name: limitId
 *         required: true
 *         schema:
 *           type: string
 *         description: Limit ID
 *     responses:
 *       200:
 *         description: Account limit deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account limit deleted successfully"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user not authorized to modify account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account or limit not found
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
router.delete('/:limitId', deleteAccountLimit);

// Remaining limit should be accessed at the accountId level
// This will be mounted at /accounts/:accountId/remaining-limit in the account.routes.ts file

export default router;
