import { Redis } from '@upstash/redis';
import { createClient } from 'redis';

let redis: any = null;

export async function getRedisClient() {
  if (redis) {
    console.log('♻️  Reusing existing Redis connection');
    return redis;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`🔗 Connecting to Redis: ${redisUrl.substring(0, 30)}...`);

    // Use Upstash Redis for remote connections
    if (redisUrl.includes('upstash.io')) {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required for Upstash');
      }

      redis = new Redis({ url, token });
      console.log('✅ Redis connected successfully (Upstash)');
      return redis;
    }

    // Use standard Redis client for local connections
    redis = createClient({ url: redisUrl });

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
    try {
      if (redis.disconnect) await redis.disconnect();
      else if (redis.quit) await redis.quit();
    } catch (e) {
      // Ignore disconnect errors
    }
    redis = null;
  }
}

export function resetRedisClient() {
  redis = null;
}