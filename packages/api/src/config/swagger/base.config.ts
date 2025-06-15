import type { Options } from 'swagger-jsdoc';

/**
 * Base OpenAPI configuration including info, servers, tags, and security schemes
 */
export const baseConfig: Options['definition'] = {
  openapi: '3.0.0',
  info: {
    title: 'SpendLess API',
    version: '1.0.0',
    description: 'A comprehensive expense tracking and budget management API',
    contact: {
      name: 'Dimas Bagus P',
      email: 'dimas.bagus.pm1@gmail.com',
    },
  },
  servers: [
    {
      url:
        process.env.API_STAGE === 'production'
          ? 'https://spenicle-api.dimasbaguspm.com/api'
          : `http://localhost:${process.env.API_PORT ?? 3000}/api`,
      description: process.env.API_STAGE === 'production' ? 'Production server' : 'Development server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and registration endpoints',
    },
    {
      name: 'Users',
      description: 'User profile management',
    },
    {
      name: 'Groups',
      description: 'Group management and user invitations',
    },
    {
      name: 'Accounts',
      description: 'Account management (savings, checking, credit, cash)',
    },
    {
      name: 'Account Limits',
      description: 'Spending limits and budget controls',
    },
    {
      name: 'Categories',
      description: 'Income and expense category management',
    },
    {
      name: 'Transactions',
      description: 'Transaction recording and management',
    },
    {
      name: 'Summary',
      description: 'Financial summaries and reporting',
    },
    {
      name: 'Health',
      description: 'API health check endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Bearer token',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};
