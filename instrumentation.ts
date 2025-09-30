export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on the server side, not in edge runtime
    const { startLeaderboardScheduler } = await import('./src/lib/scheduler');

    console.log('🔧 Initializing server-side services...');
    startLeaderboardScheduler();
  }
}