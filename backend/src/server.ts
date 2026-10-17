import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { prisma, connectPrisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { initCronJobs } from './jobs/cron.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const app = createApp();
const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  try {
    // Attempt database connection check
    await connectPrisma();

    // Initialize automated scheduled background cron tasks
    initCronJobs();

    server.listen(PORT, () => {
      logger.info(`====================================================`);
      logger.info(` Fintech Innovation Team Portal Backend Running `);
      logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(` Port:        ${PORT}`);
      logger.info(` API Prefix:  ${process.env.API_PREFIX || '/api/v1'}`);
      logger.info(` Health:      http://localhost:${PORT}/health`);
      logger.info(` API Docs:    http://localhost:${PORT}/api/v1/public/showcase`);
      logger.info(`====================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
      process.exit(0);
    } catch (err) {
      logger.error('Error disconnecting Prisma during shutdown:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server, startServer };
export default app;
