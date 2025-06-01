import cors from 'cors';
import express from 'express';

import { corsOptions, devCorsOptions } from './config/cors.config.ts';
import { pool } from './core/db/config.ts';
import { notFoundHandler } from './middleware/not-found.middleware.ts';
import apiRoutes from './routes/api.routes.ts';

const app = express();
const PORT = process.env.API_PORT ?? 3000;

// CORS middleware - use permissive settings in development
app.use(cors(process.env.API_STAGE === 'development' ? devCorsOptions : corsOptions));

app.use(express.json());

app.use('/api', apiRoutes);
app.use(notFoundHandler);

// Only start the server if the file is being executed directly and not being imported
// In tests, we just want to import the app without starting the server
if (process.env.API_STAGE !== 'test') {
  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      const client = await pool.connect();
      console.log('Database connection successful');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  };

  await (async () => {
    const isDbConnected = await testDatabaseConnection();
    if (!isDbConnected) {
      console.error('Database connection failed. Exiting...');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })();
}

export default app;
