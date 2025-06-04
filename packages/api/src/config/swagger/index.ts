import swaggerJSDoc from 'swagger-jsdoc';

import { accountLimitSchemas } from './account-limit.schemas.ts';
import { accountSchemas } from './account.schemas.ts';
import { authSchemas } from './auth.schemas.ts';
import { baseConfig } from './base.config.ts';
import { coreSchemas } from './core.schemas.ts';
import { groupSchemas } from './group.schemas.ts';
import { recurrenceSchemas } from './recurrence.schemas.ts';
import { summarySchemas } from './summary.schemas.ts';
import { transactionSchemas } from './transaction.schemas.ts';
import { userPreferencesSchemas } from './user-preferences.schemas.ts';
import { userSchemas } from './user.schemas.ts';

/**
 * Combines all schema definitions into a single components.schemas object
 */
export const getAllSchemas = () => ({
  ...coreSchemas,
  ...authSchemas,
  ...userSchemas,
  ...groupSchemas,
  ...accountSchemas,
  ...accountLimitSchemas,
  ...transactionSchemas,
  ...recurrenceSchemas,
  ...userPreferencesSchemas,
  ...summarySchemas,
});

/**
 * Main Swagger configuration combining base config with all schemas
 */
export const options = {
  definition: {
    ...baseConfig,
    components: {
      ...baseConfig?.components,
      schemas: getAllSchemas(),
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
} as any;

/**
 * Generated Swagger specification
 */
export const swaggerSpec = swaggerJSDoc(options);

export {
  baseConfig,
  coreSchemas,
  authSchemas,
  userSchemas,
  groupSchemas,
  accountSchemas,
  accountLimitSchemas,
  transactionSchemas,
  recurrenceSchemas,
  userPreferencesSchemas,
  summarySchemas,
};
