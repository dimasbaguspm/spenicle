/* eslint-disable no-console */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.API_DATABASE_URL,
});

// Initialize Drizzle ORM
const db = drizzle(pool);

// Run migrations
async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: join(__dirname, '../../../', 'sql') });
  console.log('Migrations completed');
  await pool.end();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
