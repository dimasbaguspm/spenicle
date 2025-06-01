import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: API root endpoint
 *     description: Basic information about the SpendLess API
 *     tags: [General]
 *     security: []
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SpendLess API is running"
 *                   description: Welcome message
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                   description: API status
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current server timestamp
 */
// Basic route for testing
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'SpendLess API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

export default router;
