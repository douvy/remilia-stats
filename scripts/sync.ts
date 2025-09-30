import 'dotenv/config';
import computeBeetlesLeaderboard from '../src/lib/leaderboard-sync';
import { resetRedisClient } from '../src/lib/redis';

async function main() {
  try {
    console.log('🔄 Starting manual leaderboard sync...');
    resetRedisClient(); // Force fresh connection
    await computeBeetlesLeaderboard();
    console.log('✅ Manual sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();