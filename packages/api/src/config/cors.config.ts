import { CorsOptions } from 'cors';

/**
 * CORS configuration for the SpendLess API
 * Allows cross-origin requests from frontend applications
 */
export const corsOptions: CorsOptions = {
  // Allow requests from development and production origins
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Define allowed origins based on environment
    const allowedOrigins = [
      // Development origins
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',

      // Production origins
      'https://spenicle.dimasbaguspm.com',
      'https://spenicle-api.dimasbaguspm.com',
      'https://dimasbaguspm.com',
    ];

    // In development, allow all localhost origins
    if (process.env.API_STAGE === 'development') {
      // Allow any localhost/127.0.0.1 origin in development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // If origin is not allowed, return error
    return callback(new Error('Not allowed by CORS policy'), false);
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allow specific HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allow specific headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-API-Key',
  ],

  // Expose headers to the client
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Link'],

  // Cache preflight requests for 24 hours
  maxAge: 86400,

  // Handle preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Development CORS configuration - more permissive
 */
export const devCorsOptions: CorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Link'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
