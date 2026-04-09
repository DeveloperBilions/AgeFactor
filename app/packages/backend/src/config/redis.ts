import Redis from 'ioredis';
import { env } from './env';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connection established');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

redis.on('ready', () => {
  console.log('Redis ready');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

export async function testConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('Redis connection test successful');
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

export async function disconnect(): Promise<void> {
  await redis.quit();
  console.log('Redis client disconnected');
}

export default redis;
