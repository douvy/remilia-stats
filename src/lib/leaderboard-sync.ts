import { getRedisClient } from './redis';

interface LeaderboardUser {
  username: string;
  displayName: string;
  pfpUrl: string;
  beetles: number;
  pokes: number;
  socialCredit: number;
  rank?: number;
}

interface SyncMetrics {
  totalUsers: number;
  successfulFetches: number;
  failedFetches: number;
  retryAttempts: number;
  startTime: number;
}

const USER_BATCH_SIZE = 50;
const RATE_LIMIT_DELAY = 1500;
const MAX_RETRIES = 3;
const SYNC_TIMEOUT_MS = 900000; // 15 minutes

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/2.0',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout per request
      });

      if (response.status === 429) {
        const delay = Math.min(RATE_LIMIT_DELAY * attempt, 10000);
        console.warn(`Rate limited, waiting ${delay}ms (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;

      if (attempt === retries) break;

      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.warn(`Fetch failed (attempt ${attempt}/${retries}): ${lastError.message}. Retrying in ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError!;
}

async function fetchUserProfile(username: string, metrics: SyncMetrics): Promise<LeaderboardUser | null> {
  try {
    const profile = await fetchWithRetry(`https://remilia.com/api/profile/~${username}`);

    if (!profile?.user) {
      console.warn(`Invalid profile structure for: ${username}`);
      return null;
    }

    metrics.successfulFetches++;

    return {
      username: profile.user.username || username,
      displayName: profile.user.displayName || username,
      pfpUrl: profile.user.pfpUrl || '',
      beetles: Number(profile.user.beetles) || 0,
      pokes: Number(profile.user.pokes) || 0,
      socialCredit: Number(profile.user.socialCredit?.score) || 0,
    };
  } catch (error) {
    metrics.failedFetches++;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch profile for ${username}: ${errorMessage}`);
    return null;
  }
}

async function getAllUsers(): Promise<string[]> {
  console.log('🔄 Fetching complete user list...');

  const response = await fetchWithRetry('https://remilia.com/api/friends?page=1&limit=5000&username=remilia_jackson');

  if (!response?.friends || !Array.isArray(response.friends)) {
    throw new Error('Invalid friends API response');
  }

  const usernames = response.friends
    .map((friend: any) => friend.displayUsername)
    .filter((username: string) => username && username.trim());

  console.log(`✅ Found ${usernames.length} users to process`);
  return usernames;
}

async function processBatch(
  usernames: string[],
  batchIndex: number,
  totalBatches: number,
  metrics: SyncMetrics
): Promise<LeaderboardUser[]> {
  const startIndex = batchIndex * USER_BATCH_SIZE;
  const batch = usernames.slice(startIndex, startIndex + USER_BATCH_SIZE);

  console.log(`🔄 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} users)`);

  const results = await Promise.allSettled(
    batch.map(username => fetchUserProfile(username, metrics))
  );

  const validUsers: LeaderboardUser[] = [];
  let batchFailures = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      validUsers.push(result.value);
    } else {
      batchFailures++;
      if (result.status === 'rejected') {
        console.error(`Batch item failed: ${batch[index]} - ${result.reason}`);
      }
    }
  });

  const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
  const successRate = metrics.successfulFetches / (metrics.successfulFetches + metrics.failedFetches) * 100;

  console.log(`✅ Batch ${batchIndex + 1} complete: ${validUsers.length}/${batch.length} success | Progress: ${progress}% | Success rate: ${successRate.toFixed(1)}%`);

  return validUsers;
}

export default async function computeBeetlesLeaderboard(): Promise<LeaderboardUser[]> {
  const redis = await getRedisClient();
  const metrics: SyncMetrics = {
    totalUsers: 0,
    successfulFetches: 0,
    failedFetches: 0,
    retryAttempts: 0,
    startTime: Date.now(),
  };

  try {
    console.log('🚀 Starting leaderboard sync...');

    // Get all users first
    const usernames = await getAllUsers();
    metrics.totalUsers = usernames.length;

    const totalBatches = Math.ceil(usernames.length / USER_BATCH_SIZE);
    const allUsers: LeaderboardUser[] = [];

    // Process users in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchUsers = await processBatch(usernames, batchIndex, totalBatches, metrics);
      allUsers.push(...batchUsers);

      // Rate limiting between batches
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      // Safety check for runaway syncs
      if (Date.now() - metrics.startTime > SYNC_TIMEOUT_MS) {
        throw new Error('Sync timeout exceeded - preventing runaway process');
      }
    }

    // Validate we got data
    if (allUsers.length === 0) {
      throw new Error('No valid users retrieved - critical sync failure');
    }

    // Sort and rank users by beetles (primary rank)
    const beetlesSorted = [...allUsers].sort((a, b) => b.beetles - a.beetles);
    const pokesSorted = [...allUsers].sort((a, b) => b.pokes - a.pokes);
    const socialCreditSorted = [...allUsers].sort((a, b) => b.socialCredit - a.socialCredit);

    // Create rank maps
    const beetlesRankMap = new Map(beetlesSorted.map((user, index) => [user.username, index + 1]));
    const pokesRankMap = new Map(pokesSorted.map((user, index) => [user.username, index + 1]));
    const socialCreditRankMap = new Map(socialCreditSorted.map((user, index) => [user.username, index + 1]));

    // Add all ranks to each user
    const sortedUsers = beetlesSorted.map((user) => ({
      ...user,
      rank: beetlesRankMap.get(user.username)!,
      pokesRank: pokesRankMap.get(user.username)!,
      socialCreditRank: socialCreditRankMap.get(user.username)!,
    }));

    // Store in Redis
    await redis.setEx('beetles-leaderboard', 86400, JSON.stringify(sortedUsers));

    // Calculate and store metadata
    const totalPokes = sortedUsers.reduce((sum, user) => sum + user.pokes, 0);
    const activeUsers = sortedUsers.filter(user => user.beetles > 0).length;
    const totalSocialCredit = sortedUsers.reduce((sum, user) => sum + user.socialCredit, 0);

    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalUsers: sortedUsers.length,
      totalPokes,
      totalSocialCredit,
      activeUsers,
      topBeetles: sortedUsers[0]?.beetles || 0,
      syncMetrics: {
        ...metrics,
        totalDuration: Date.now() - metrics.startTime,
        successRate: (metrics.successfulFetches / metrics.totalUsers) * 100,
      }
    };

    await redis.setEx('beetles-leaderboard-meta', 86400, JSON.stringify(metadata));

    // Final logging
    const duration = (Date.now() - metrics.startTime) / 1000;
    const successRate = (metrics.successfulFetches / metrics.totalUsers) * 100;

    console.log(`✅ Sync completed in ${duration.toFixed(1)}s`);
    console.log(`📊 Results: ${sortedUsers.length} users | ${successRate.toFixed(1)}% success rate`);
    console.log(`🏆 Top beetles: ${sortedUsers[0]?.beetles || 0} | Active users: ${activeUsers}`);

    if (successRate < 95) {
      console.warn(`⚠️ Success rate below 95%: ${successRate.toFixed(1)}% - investigate API issues`);
    }

    return sortedUsers;

  } catch (error) {
    const duration = (Date.now() - metrics.startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Sync failed after ${duration.toFixed(1)}s:`, errorMessage);
    console.error(`📊 Progress: ${metrics.successfulFetches}/${metrics.totalUsers} users processed`);
    throw error;
  }
}