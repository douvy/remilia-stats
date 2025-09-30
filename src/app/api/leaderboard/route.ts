import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const redis = await getRedisClient();

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'beetles';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Get leaderboard data from Redis
    const leaderboardData = await redis.get('beetles-leaderboard');
    const metaData = await redis.get('beetles-leaderboard-meta');

    if (!leaderboardData) {
      return NextResponse.json(
        {
          error: 'Leaderboard data not available yet. Please wait for initial sync.',
          users: [],
          pagination: { page: 1, limit: 25, total: 0, pages: 0 },
          meta: { lastUpdated: null, totalUsers: 0 }
        },
        { status: 202 } // 202 Accepted - processing
      );
    }

    // Upstash REST returns already parsed data, standard Redis returns string
    const allUsers = typeof leaderboardData === 'string' ? JSON.parse(leaderboardData) : leaderboardData;
    const meta = metaData ? (typeof metaData === 'string' ? JSON.parse(metaData) : metaData) : {};

    // Filter by search query if provided
    let filteredUsers = allUsers;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredUsers = allUsers.filter((user: any) =>
        user.username.toLowerCase().includes(searchLower) ||
        user.displayName.toLowerCase().includes(searchLower)
      );
    }

    // Sort users
    filteredUsers.sort((a: any, b: any) => {
      let aValue, bValue;

      if (sortBy === 'username' || sortBy === 'user') {
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        return sortDirection === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      } else {
        aValue = a[sortBy] || 0;
        bValue = b[sortBy] || 0;
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }
    });

    // Calculate pagination
    const total = filteredUsers.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get the page of users
    const users = filteredUsers.slice(startIndex, endIndex);

    // Use pre-calculated ranks based on sort field
    const rankedUsers = users.map((user: any) => ({
      ...user,
      rank: sortBy === 'pokes' ? user.pokesRank :
            sortBy === 'socialCredit' ? user.socialCreditRank :
            user.rank // beetles rank (default)
    }));

    return NextResponse.json({
      users: rankedUsers,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
      meta: {
        lastUpdated: meta.lastUpdated,
        totalUsers: meta.totalUsers || allUsers.length,
        totalPokes: meta.totalPokes || 0,
        activeUsers: meta.activeUsers || 0,
        searchQuery: search || null,
      }
    });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}

// Manual sync moved to /api/sync endpoint