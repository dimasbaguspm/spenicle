import express, { Router } from 'express';

import { authenticateJWT } from '../middleware/auth.middleware.ts';

import accountRoutes from './account.routes.ts';
import authRoutes from './auth.routes.ts';
import categoryRoutes from './category.routes.ts';
import docsRoutes from './docs.routes.ts';
import groupRoutes from './group.routes.ts';
import healthRoutes from './health.routes.ts';
import indexRoutes from './index.routes.ts';
import summaryRoutes from './summary.routes.ts';
import transactionRoutes from './transaction.routes.ts';
import userRoutes from './user.routes.ts';

const router: Router = express.Router();

// Public routes that don't require authentication
router.use('/', indexRoutes);
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/docs', docsRoutes);

// All routes below require authentication
router.use(authenticateJWT);

// Protected routes
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/groups', groupRoutes);
router.use('/transactions', transactionRoutes);
router.use('/summary', summaryRoutes);
router.use('/users', userRoutes);

export default router;
