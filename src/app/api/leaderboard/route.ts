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
    let allUsers;
    let meta;

    try {
      allUsers = typeof leaderboardData === 'string' ? JSON.parse(leaderboardData) : leaderboardData;
      meta = metaData ? (typeof metaData === 'string' ? JSON.parse(metaData) : metaData) : {};
    } catch (e) {
      // If parsing fails, data is already an object
      allUsers = leaderboardData;
      meta = metaData || {};
    }

    // Filter by search query if provided
    let filteredUsers = allUsers;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      // First try exact username match
      const exactMatch = allUsers.find((user: any) =>
        user.username.toLowerCase() === searchLower
      );

      if (exactMatch) {
        filteredUsers = [exactMatch];
      } else {
        // Fall back to partial match
        filteredUsers = allUsers.filter((user: any) =>
          user.username.toLowerCase().includes(searchLower) ||
          user.displayName.toLowerCase().includes(searchLower)
        );
      }
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

    // Compute ranks with tie handling based on current sort
    const getSortValue = (user: any) => {
      if (sortBy === 'username' || sortBy === 'user') return null; // No rank for username sort
      return user[sortBy] || 0;
    };

    let currentRank = 1;
    let prevValue: number | null = null;

    filteredUsers = filteredUsers.map((user: any, index: number) => {
      const value = getSortValue(user);

      // Update rank only when value changes (handles ties)
      if (value !== null && prevValue !== null && value !== prevValue) {
        currentRank = index + 1;
      }

      prevValue = value;

      return {
        ...user,
        rank: value !== null ? currentRank : user.rank, // Use computed rank or keep beetles rank
      };
    });

    // Calculate pagination
    const total = filteredUsers.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get the page of users
    const rankedUsers = filteredUsers.slice(startIndex, endIndex);

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