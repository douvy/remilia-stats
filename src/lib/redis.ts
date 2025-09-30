import { createClient } from 'redis';

let redis: any = null;

export async function getRedisClient() {
  if (redis) {
    return redis;
  }

  try {
    // For local development, try to connect to local Redis
    // For production, use REDIS_URL environment variable
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = createClient({
      url: redisUrl,
    });

    redis.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redis.connect();
    return redis;

  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    console.log('💡 Make sure Redis is running locally or REDIS_URL is set');

    // Return a mock Redis client for development
    return {
      setex: async (key: string, ttl: number, value: string) => {
        console.log(`Mock Redis SET: ${key} = ${value.substring(0, 100)}...`);
      },
      get: async (key: string) => {
        console.log(`Mock Redis GET: ${key}`);
        return null;
      },
      del: async (key: string) => {
        console.log(`Mock Redis DEL: ${key}`);
      }
    };
  }
}

export async function disconnectRedis() {
  if (redis) {
    await redis.disconnect();
    redis = null;
  }
}