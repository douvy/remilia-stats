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
  cacheHits: number;
  startTime: number;
}

const USER_BATCH_SIZE = 50; // Conservative to avoid overwhelming API
const RATE_LIMIT_DELAY = 1500; // Generous delay between batches
const MAX_RETRIES = 3; // Handle rate limits with retries
const CONCURRENCY_LIMIT = 15; // Lower concurrency to reduce burst rate

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/2.0',
        },
        signal: AbortSignal.timeout(20000),
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

async function fetchUserProfile(username: string, metrics: SyncMetrics, redis: any): Promise<LeaderboardUser | null> {
  // Check cache first - using separate namespace to avoid conflicts with profile endpoint
  const cacheKey = `leaderboard-stats:${username}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    metrics.cacheHits++;
    const profile = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return profile;
  }

  // Not in cache, fetch from API
  try {
    const profile = await fetchWithRetry(`https://remilia.com/api/profile/~${username}`);

    if (!profile?.user) {
      console.warn(`Invalid profile structure for: ${username}`);
      return null;
    }

    metrics.successfulFetches++;

    // Cache ONLY raw stats (no rank fields) - ranks computed fresh every sync
    const userProfile: LeaderboardUser = {
      username: profile.user.username || username,
      displayName: profile.user.displayName || username,
      pfpUrl: profile.user.pfpUrl || '',
      beetles: Number(profile.user.beetles) || 0,
      pokes: Number(profile.user.pokes) || 0,
      socialCredit: Number(profile.user.socialCredit?.score) || 0,
    };

    // Cache for 5 hours (longer than 4hr sync interval)
    // This ensures next sync uses cache, data refreshes every 2 sync cycles (8hrs)
    await redis.set(cacheKey, JSON.stringify(userProfile), { ex: 18000 });

    return userProfile;
  } catch (error) {
    metrics.failedFetches++;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch profile for ${username}: ${errorMessage}`);
    return null;
  }
}

async function getAllUsers(redis: any): Promise<string[]> {
  // Check if we have a cached user list (valid for 24 hours)
  const cachedList = await redis.get('user-list-cache');
  if (cachedList) {
    const usernames = typeof cachedList === 'string' ? JSON.parse(cachedList) : cachedList;
    console.log(`✅ Using cached user list (${usernames.length} users)`);
    return usernames;
  }

  console.log('🔄 Fetching fresh user list from API...');

  const seedUsers = ['remilia_jackson', 'xultra'];
  const allUsernames = new Set<string>();

  for (const seedUser of seedUsers) {
    try {
      console.log(`  Fetching friends for ${seedUser}...`);
      const response = await fetch(`https://remilia.com/api/friends?page=1&limit=10000&username=${seedUser}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/2.0',
        },
        signal: AbortSignal.timeout(120000), // 2min for large friend lists
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.friends || !Array.isArray(data.friends)) {
        console.warn(`Invalid friends API response for ${seedUser}`);
        continue;
      }

      const usernames = data.friends
        .map((friend: any) => friend.displayUsername)
        .filter((username: string) => username && username.trim());

      usernames.forEach((username: string) => allUsernames.add(username));
      console.log(`  Found ${usernames.length} friends for ${seedUser}`);
    } catch (error) {
      console.error(`Failed to fetch friends for ${seedUser}:`, error);
    }
  }

  seedUsers.forEach(seedUser => allUsernames.add(seedUser));

  const finalUsernames = Array.from(allUsernames);
  console.log(`✅ Found ${finalUsernames.length} unique users to process`);

  // Cache the user list for 24 hours
  await redis.set('user-list-cache', JSON.stringify(finalUsernames), { ex: 86400 });
  console.log('💾 Cached user list for 24 hours');

  return finalUsernames;
}

/**
 * CLEAN APPROACH: Fetch all users, process what we can in time limit, save complete leaderboard
 * No multi-pass, no HTTP chaining, just simple and reliable
 */
export default async function computeBeetlesLeaderboard(): Promise<LeaderboardUser[]> {
  const redis = await getRedisClient();
  const metrics: SyncMetrics = {
    totalUsers: 0,
    successfulFetches: 0,
    failedFetches: 0,
    retryAttempts: 0,
    cacheHits: 0,
    startTime: Date.now(),
  };

  try {
    console.log('🚀 Starting leaderboard sync...');

    // Get all users
    const allUsernames = await getAllUsers(redis);
    metrics.totalUsers = allUsernames.length;

    const totalBatches = Math.ceil(allUsernames.length / USER_BATCH_SIZE);
    const allFetchedUsers: LeaderboardUser[] = [];

    // Process ALL users in batches - we'll work through as many as we can
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * USER_BATCH_SIZE;
      const batch = allUsernames.slice(startIndex, startIndex + USER_BATCH_SIZE);

      console.log(`🔄 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} users)`);

      const validUsers: LeaderboardUser[] = [];

      // Process batch with concurrency control
      for (let i = 0; i < batch.length; i += CONCURRENCY_LIMIT) {
        const chunk = batch.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.allSettled(
          chunk.map(username => fetchUserProfile(username, metrics, redis))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            validUsers.push(result.value);
          } else if (result.status === 'rejected') {
            console.error(`Batch item failed: ${chunk[index]} - ${result.reason}`);
          }
        });
      }

      allFetchedUsers.push(...validUsers);

      const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
      const successRate = metrics.successfulFetches / (metrics.successfulFetches + metrics.failedFetches) * 100;
      const elapsedSec = ((Date.now() - metrics.startTime) / 1000).toFixed(1);

      console.log(`✅ Batch ${batchIndex + 1}/${totalBatches}: ${validUsers.length}/${batch.length} ok | ${progress}% | API: ${metrics.successfulFetches} | ${elapsedSec}s elapsed`);

      // Rate limiting between batches
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      // Safety timeout check - with Fluid Compute we have 800s (13.3min)
      const elapsedMs = Date.now() - metrics.startTime;
      if (elapsedMs > 780000) { // 13 minutes (leave 20s buffer for saving to Redis)
        console.warn(`⚠️ Approaching timeout at ${(elapsedMs / 1000).toFixed(1)}s - saving ${allFetchedUsers.length} users`);
        break;
      }
    }

    // Validate we got data
    if (allFetchedUsers.length === 0) {
      throw new Error('No valid users retrieved - critical sync failure');
    }

    // CRITICAL: Only save leaderboard if we have nearly all users
    // Partial syncs create incorrect global rankings
    const completionRate = allFetchedUsers.length / metrics.totalUsers;
    if (completionRate < 0.85) { // Need at least 85% of users
      console.warn(`⚠️ Incomplete sync: ${allFetchedUsers.length}/${metrics.totalUsers} users (${(completionRate * 100).toFixed(1)}%)`);
      console.warn(`❌ NOT saving leaderboard - would create incorrect rankings`);
      console.warn(`⚠️ Sync timed out before completing. Will retry on next scheduled run.`);
      throw new Error(`INCOMPLETE_SYNC: Only ${allFetchedUsers.length}/${metrics.totalUsers} users fetched`);
    }

    console.log(`✅ Complete sync: ${allFetchedUsers.length} of ${metrics.totalUsers} users (${(completionRate * 100).toFixed(1)}%)`);
    console.log(`📊 API calls: ${metrics.successfulFetches}, Failed: ${metrics.failedFetches}`);

    // Sort and rank
    const beetlesSorted = [...allFetchedUsers].sort((a, b) => b.beetles - a.beetles);
    const pokesSorted = [...allFetchedUsers].sort((a, b) => b.pokes - a.pokes);
    const socialCreditSorted = [...allFetchedUsers].sort((a, b) => b.socialCredit - a.socialCredit);

    const createRankMap = (sortedUsers: LeaderboardUser[], getScore: (user: LeaderboardUser) => number): Map<string, number> => {
      const rankMap = new Map<string, number>();
      let currentRank = 1;
      let prevScore: number | null = null;

      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        const score = getScore(user);

        if (prevScore !== null && score !== prevScore) {
          currentRank = i + 1;
        }

        rankMap.set(user.username, currentRank);
        prevScore = score;
      }

      return rankMap;
    };

    const beetlesRankMap = createRankMap(beetlesSorted, u => u.beetles);
    const pokesRankMap = createRankMap(pokesSorted, u => u.pokes);
    const socialCreditRankMap = createRankMap(socialCreditSorted, u => u.socialCredit);

    const sortedUsers = beetlesSorted.map((user) => ({
      ...user,
      rank: beetlesRankMap.get(user.username)!,
      pokesRank: pokesRankMap.get(user.username)!,
      socialCreditRank: socialCreditRankMap.get(user.username)!,
    }));

    // Store in Redis
    const payload = JSON.stringify(sortedUsers);
    console.log(`📦 Storing ${sortedUsers.length} users (${(payload.length / 1024 / 1024).toFixed(2)}MB)`);
    await redis.set('beetles-leaderboard', payload, { ex: 86400 });

    // Store metadata
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

    await redis.set('beetles-leaderboard-meta', JSON.stringify(metadata), { ex: 86400 });

    const duration = (Date.now() - metrics.startTime) / 1000;
    const successRate = (metrics.successfulFetches / metrics.totalUsers) * 100;

    console.log(`✅ Sync completed in ${duration.toFixed(1)}s`);
    console.log(`📊 Results: ${sortedUsers.length} users | ${successRate.toFixed(1)}% success rate`);

    return sortedUsers;

  } catch (error) {
    const duration = (Date.now() - metrics.startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Sync failed after ${duration.toFixed(1)}s:`, errorMessage);
    console.error(`📊 Progress: ${metrics.successfulFetches}/${metrics.totalUsers} users processed`);
    throw error;
  }
}
