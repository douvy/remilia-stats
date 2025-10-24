import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const redis = await getRedisClient();

    console.log('🧹 Starting Redis cache flush...');

    // Define all the keys we need to flush
    const keysToFlush = [
      'beetles-leaderboard',
      'beetles-leaderboard-meta',
      'user-list-cache',
    ];

    // Delete each specific key
    const deletedKeys: string[] = [];
    for (const key of keysToFlush) {
      try {
        await redis.del(key);
        deletedKeys.push(key);
        console.log(`✅ Deleted key: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to delete key ${key}:`, error);
      }
    }

    // Handle profile:* pattern - need to find and delete all profile keys
    let profileKeysDeleted = 0;
    try {
      // For Upstash Redis (REST API)
      if (redis.constructor.name === 'Redis') {
        // Upstash doesn't support SCAN via REST, so we'll use KEYS (acceptable for one-time flush)
        const profileKeys = await redis.keys('profile:*');
        if (profileKeys && profileKeys.length > 0) {
          // Delete in batches
          for (const key of profileKeys) {
            await redis.del(key);
            profileKeysDeleted++;
          }
        }
      } else {
        // Standard Redis client supports SCAN
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            MATCH: 'profile:*',
            COUNT: 100
          });
          cursor = result.cursor;
          const keys = result.keys;

          if (keys && keys.length > 0) {
            await redis.del(...keys);
            profileKeysDeleted += keys.length;
          }
        } while (cursor !== 0);
      }
      console.log(`✅ Deleted ${profileKeysDeleted} profile:* keys`);
    } catch (error) {
      console.error('❌ Failed to delete profile:* keys:', error);
    }

    const totalDeleted = deletedKeys.length + profileKeysDeleted;

    console.log(`✅ Cache flush completed: ${totalDeleted} keys deleted`);

    return NextResponse.json({
      success: true,
      message: 'Redis cache flushed successfully',
      deletedKeys: {
        specific: deletedKeys,
        profileKeys: profileKeysDeleted,
        total: totalDeleted,
      },
      timestamp: new Date().toISOString(),
      nextStep: 'Run POST /api/sync to rebuild the leaderboard with fresh data'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cache flush failed:', message);
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

// GET request returns status and allows checking what keys exist
export async function GET(request: NextRequest) {
  try {
    const redis = await getRedisClient();

    const keysToCheck = [
      'beetles-leaderboard',
      'beetles-leaderboard-meta',
      'user-list-cache',
    ];

    const keyStatus: Record<string, boolean> = {};
    for (const key of keysToCheck) {
      const exists = await redis.exists(key);
      keyStatus[key] = exists > 0;
    }

    // Count profile keys
    let profileKeyCount = 0;
    try {
      if (redis.constructor.name === 'Redis') {
        const profileKeys = await redis.keys('profile:*');
        profileKeyCount = profileKeys ? profileKeys.length : 0;
      } else {
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            MATCH: 'profile:*',
            COUNT: 100
          });
          cursor = result.cursor;
          profileKeyCount += result.keys ? result.keys.length : 0;
        } while (cursor !== 0);
      }
    } catch (error) {
      console.error('Error counting profile keys:', error);
    }

    return NextResponse.json({
      keyStatus,
      profileKeyCount,
      message: 'Use POST /api/flush-cache to delete all cached data',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cache status check failed:', message);
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}
