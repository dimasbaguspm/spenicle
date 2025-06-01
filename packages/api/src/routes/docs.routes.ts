import express, { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from '../config/swagger.config.ts';

const router: Router = express.Router();

/**
 * @swagger
 * /docs:
 *   get:
 *     summary: Swagger UI documentation
 *     description: Interactive API documentation using Swagger UI
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /docs/swagger.json:
 *   get:
 *     summary: OpenAPI JSON specification
 *     description: Raw OpenAPI 3.0 specification in JSON format
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SpendLess API Documentation',
    customfavIcon: '/assets/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  })
);

// Serve raw OpenAPI spec as JSON
router.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
