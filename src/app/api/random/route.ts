import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    const redis = await getRedisClient();

    // Get cached leaderboard (already in memory from sync)
    const leaderboardData = await redis.get('beetles-leaderboard');

    if (!leaderboardData) {
      return NextResponse.json(
        { error: 'Leaderboard not available' },
        { status: 503 }
      );
    }

    const users = typeof leaderboardData === 'string'
      ? JSON.parse(leaderboardData)
      : leaderboardData;

    // Weighted random: 70% chance top 1000, 30% chance entire pool
    // This surfaces interesting profiles more often while still allowing deep cuts
    const useTopSlice = Math.random() < 0.7;
    const pool = useTopSlice ? users.slice(0, Math.min(1000, users.length)) : users;

    const randomUser = pool[Math.floor(Math.random() * pool.length)];

    return NextResponse.json({
      username: randomUser.username
    }, {
      headers: {
        'Cache-Control': 'no-store', // Never cache random results
      }
    });

  } catch (error) {
    console.error('Random profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get random profile' },
      { status: 500 }
    );
  }
}
