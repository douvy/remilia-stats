import computeBeetlesLeaderboard from '../src/lib/leaderboard-sync';

async function main() {
  try {
    console.log('🔄 Starting manual leaderboard sync...');
    await computeBeetlesLeaderboard();
    console.log('✅ Manual sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();