import type { Config } from 'drizzle-kit';

export default {
  schema: './src/models/schema.ts',
  out: './sql',
  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.API_DATABASE_URL ?? '',
  },
} satisfies Config;
