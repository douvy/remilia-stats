import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const redis = await getRedisClient();

    // Check short-term cache (2 min) to prevent duplicate API calls
    const profileCacheKey = `profile-view:${username}`;
    try {
      const cachedProfile = await redis.get(profileCacheKey);
      if (cachedProfile) {
        const parsed = typeof cachedProfile === 'string' ? JSON.parse(cachedProfile) : cachedProfile;
        return NextResponse.json(parsed);
      }
    } catch (cacheError) {
      console.warn('Cache read failed, fetching fresh:', cacheError);
      // Continue to fetch fresh if cache read fails
    }

    // Fetch fresh from API
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

    // Update leaderboard cache with fresh stats (for next sync)
    if (data.user) {
      try {
        const leaderboardStatsKey = `leaderboard-stats:${username}`;
        const freshStats = {
          username: data.user.username || username,
          displayName: data.user.displayName || username,
          pfpUrl: data.user.pfpUrl || '',
          beetles: Number(data.user.beetles) || 0,
          pokes: Number(data.user.pokes) || 0,
          socialCredit: Number(data.user.socialCredit?.score) || 0,
        };
        // Update leaderboard cache with 5hr TTL (matches sync cache)
        await redis.set(leaderboardStatsKey, JSON.stringify(freshStats), { ex: 18000 });
      } catch (cacheError) {
        console.warn('Failed to update leaderboard cache:', cacheError);
        // Non-critical - continue returning profile data
      }
    }

    // Set lastUpdated to current time since we just fetched fresh data
    const enrichedData = {
      ...data,
      meta: {
        lastUpdated: new Date().toISOString(),
      }
    };

    // Cache profile view for 2 minutes to prevent duplicate API calls
    try {
      await redis.set(profileCacheKey, JSON.stringify(enrichedData), { ex: 120 });
    } catch (cacheError) {
      console.warn('Failed to cache profile view:', cacheError);
      // Non-critical - continue returning data
    }

    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('API profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}