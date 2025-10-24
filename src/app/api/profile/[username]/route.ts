import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const CACHE_TTL = 4 * 60 * 60; // 4 hours in seconds

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const redis = await getRedisClient();
    const cacheKey = `profile:${username}`;

    // Try to get from cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;

      // Check if this is the full API response (has .user) or just the user object
      if (parsed.user) {
        // Full cached response from this endpoint
        return NextResponse.json(parsed);
      } else if (parsed.username) {
        // Cached from leaderboard sync - needs to be wrapped
        // Skip cache and fetch fresh data to get full profile details
        // (leaderboard cache only has basic stats, not bio, friends, etc)
      }
    }

    // Fetch from Remilia API
    const response = await fetch(
      `https://remilia.com/api/profile/~${username}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/1.0',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch profile for ${username}: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Get lastUpdated from leaderboard meta to stay in sync
    const metaData = await redis.get('beetles-leaderboard-meta');
    let lastUpdated = new Date().toISOString();

    if (metaData) {
      try {
        const meta = typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
        if (meta.lastUpdated) {
          lastUpdated = meta.lastUpdated;
        }
      } catch (e) {
        // Use current time if parsing fails
      }
    }

    // Add lastUpdated timestamp from leaderboard sync
    const enrichedData = {
      ...data,
      meta: {
        lastUpdated,
      }
    };

    // Cache the data with 4-hour TTL
    await redis.set(cacheKey, JSON.stringify(enrichedData), { ex: CACHE_TTL });

    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('API profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}