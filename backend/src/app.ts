import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';

dotenv.config();

export const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  const originEnv =
    process.env.FRONTEND_ORIGIN ||
    process.env.CORS_ORIGIN ||
    'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173';
  const allowedOrigins = originEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or if in development
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Rate Limiting (Prevents brute-force on auth & API routes)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again later.' },
  });
  app.use('/api/', apiLimiter);

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Morgan HTTP logging routed to Winston
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );

  // Static uploads (Only non-sensitive assets if needed, private files go through /documents/:id/download)
  const publicAssetsDir = path.resolve(process.cwd(), 'public-assets');
  if (!fs.existsSync(publicAssetsDir)) {
    fs.mkdirSync(publicAssetsDir, { recursive: true });
  }
  app.use('/public-assets', express.static(publicAssetsDir));

  // Base Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'FinTech Innovation Team Portal API',
      timestamp: new Date().toISOString(),
    });
  });

  // Master API Routing (v1)
  const prefix = process.env.API_PREFIX || '/api/v1';
  app.use(prefix, apiRoutes);
  // Alias /api to apiRoutes as well
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use(globalErrorHandler);

  return app;
};
