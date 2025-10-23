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

const USER_BATCH_SIZE = 100; // Increased from 50
const RATE_LIMIT_DELAY = 500; // Reduced from 1500ms
const MAX_RETRIES = 2; // Reduced from 3
const SYNC_TIMEOUT_MS = 270000; // 4.5 minutes (under Vercel's 5min limit)

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/2.0',
        },
        signal: AbortSignal.timeout(8000), // 8s timeout per request
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
  console.log('🔄 Fetching complete user list from multiple seed users...');

  const seedUsers = ['remilia_jackson', 'xultra'];
  const allUsernames = new Set<string>();

  // Fetch friends from each seed user
  for (const seedUser of seedUsers) {
    try {
      console.log(`  Fetching friends for ${seedUser}...`);
      // Friend list fetches can be large, use longer timeout
      const response = await fetch(`https://remilia.com/api/friends?page=1&limit=10000&username=${seedUser}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RemiliaStats/2.0',
        },
        signal: AbortSignal.timeout(15000), // 15s for large friend lists
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
      // Continue with other seed users even if one fails
    }
  }

  // Ensure seed users are included (may not be in their own friends lists)
  seedUsers.forEach(seedUser => allUsernames.add(seedUser));

  const finalUsernames = Array.from(allUsernames);
  console.log(`✅ Found ${finalUsernames.length} unique users to process`);
  return finalUsernames;
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
  const elapsed = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
  const eta = totalBatches > 0 ? (((Date.now() - metrics.startTime) / (batchIndex + 1)) * (totalBatches - batchIndex - 1) / 1000).toFixed(0) : 0;

  console.log(`✅ Batch ${batchIndex + 1}/${totalBatches}: ${validUsers.length}/${batch.length} ok | ${progress}% | ${successRate.toFixed(1)}% success | ${elapsed}s elapsed | ETA: ${eta}s`);

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

      // Safety check for timeout (with 30s buffer)
      const elapsed = Date.now() - metrics.startTime;
      if (elapsed > SYNC_TIMEOUT_MS) {
        console.warn(`⚠️ Sync timeout approaching at ${(elapsed / 1000).toFixed(1)}s - saving partial results`);
        break; // Exit loop and save what we have
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

    // Helper to create rank map with proper tie handling (standard competition ranking)
    const createRankMap = (sortedUsers: LeaderboardUser[], getScore: (user: LeaderboardUser) => number): Map<string, number> => {
      const rankMap = new Map<string, number>();
      let currentRank = 1;
      let prevScore: number | null = null;

      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        const score = getScore(user);

        // If score differs from previous, update rank to current position
        if (prevScore !== null && score !== prevScore) {
          currentRank = i + 1;
        }

        rankMap.set(user.username, currentRank);
        prevScore = score;
      }

      return rankMap;
    };

    // Create rank maps with tie handling
    const beetlesRankMap = createRankMap(beetlesSorted, u => u.beetles);
    const pokesRankMap = createRankMap(pokesSorted, u => u.pokes);
    const socialCreditRankMap = createRankMap(socialCreditSorted, u => u.socialCredit);

    // Add all ranks to each user
    const sortedUsers = beetlesSorted.map((user) => ({
      ...user,
      rank: beetlesRankMap.get(user.username)!,
      pokesRank: pokesRankMap.get(user.username)!,
      socialCreditRank: socialCreditRankMap.get(user.username)!,
    }));

    // Store in Redis
    const payload = JSON.stringify(sortedUsers);
    console.log(`📦 Storing ${sortedUsers.length} users (${(payload.length / 1024 / 1024).toFixed(2)}MB)`);
    const result = await redis.set('beetles-leaderboard', payload, { ex: 86400 });
    console.log('✅ Redis SET result:', result);

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

    await redis.set('beetles-leaderboard-meta', JSON.stringify(metadata), { ex: 86400 });

    // Clear profile caches in batches to avoid timeout
    console.log('🗑️ Clearing profile caches in batches...');
    const DELETE_BATCH_SIZE = 500; // Delete this many keys at once
    const BATCH_DELAY_MS = 100; // Small delay between batches
    let cursor = 0;
    let totalCleared = 0;
    let deletionBatch: string[] = [];

    do {
      // Scan for keys - get up to 1000 at a time
      const result = await redis.scan(cursor, { match: 'profile:*', count: 1000 });
      cursor = result[0];
      const keys = result[1];

      deletionBatch.push(...keys);

      // Delete in batches of DELETE_BATCH_SIZE
      while (deletionBatch.length >= DELETE_BATCH_SIZE) {
        const toDelete = deletionBatch.splice(0, DELETE_BATCH_SIZE);
        await redis.del(...toDelete);
        totalCleared += toDelete.length;
        console.log(`   Cleared ${totalCleared} caches...`);

        // Small delay to avoid overwhelming Redis
        if (deletionBatch.length > 0 || cursor !== 0) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
    } while (cursor !== 0);

    // Clear any remaining keys
    if (deletionBatch.length > 0) {
      await redis.del(...deletionBatch);
      totalCleared += deletionBatch.length;
    }

    console.log(`✅ Cleared ${totalCleared} profile caches`);

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