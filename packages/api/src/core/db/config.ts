import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../../models/schema.ts';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.API_DATABASE_URL,
});

// Create a Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };
