import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { testConnection as testDbConnection, closePool } from './config/database';
import { testConnection as testRedisConnection, disconnect as disconnectRedis } from './config/redis';

const PORT = env.PORT;

let server: ReturnType<typeof app.listen>;

async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Test Redis connection
    console.log('Testing Redis connection...');
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }

    // Start server
    server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  Long Health API Server Started         ║
╠════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(30)}║
║  Environment: ${env.NODE_ENV.padEnd(29)}║
║  Timestamp:   ${new Date().toISOString().padEnd(29)}║
╚════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[${signal}] Received, shutting down gracefully...`);

      server.close(async () => {
        console.log('Server closed');

        try {
          await closePool();
        } catch (error) {
          console.error('Error closing database pool:', error);
        }

        try {
          await disconnectRedis();
        } catch (error) {
          console.error('Error disconnecting Redis:', error);
        }

        console.log('All connections closed. Exiting...');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
