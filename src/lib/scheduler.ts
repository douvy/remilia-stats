import * as cron from 'node-cron';
import computeBeetlesLeaderboard from './leaderboard-sync';

let syncJob: cron.ScheduledTask | null = null;
let isManualSyncRunning = false;

export function startLeaderboardScheduler() {
  if (syncJob) {
    console.log('⚠️ Scheduler already running');
    return;
  }

  console.log('🚀 Starting leaderboard scheduler');

  // Production: every 4 hours, Development: every 15 minutes
  const schedule = process.env.NODE_ENV === 'production'
    ? '0 */4 * * *'    // Every 4 hours at :00 minutes
    : '*/15 * * * *';   // Every 15 minutes in development

  syncJob = cron.schedule(schedule, async () => {
    if (isManualSyncRunning) {
      console.log('⏭️ Skipping scheduled sync - manual sync in progress');
      return;
    }

    console.log('⏰ Running scheduled leaderboard sync...');
    try {
      await computeBeetlesLeaderboard();
      console.log('✅ Scheduled sync completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Scheduled sync failed:', errorMessage);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Run initial sync after startup delay
  setTimeout(async () => {
    if (isManualSyncRunning) return;

    console.log('🔄 Running initial leaderboard sync...');
    try {
      await computeBeetlesLeaderboard();
      console.log('✅ Initial sync completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Initial sync failed:', errorMessage);
    }
  }, 10000);

  console.log(`📅 Leaderboard scheduled: ${schedule} (UTC)`);
}

export function stopLeaderboardScheduler() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    console.log('🛑 Leaderboard scheduler stopped');
  }
}

export async function runManualSync(syncPass?: { pass: number; totalPasses: number; offset: number; limit: number }): Promise<void> {
  if (isManualSyncRunning && !syncPass) {
    throw new Error('Manual sync already in progress');
  }

  if (!syncPass) {
    isManualSyncRunning = true;
  }

  console.log('🔄 Starting manual sync');

  try {
    await computeBeetlesLeaderboard(syncPass);
    console.log('✅ Manual sync completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Manual sync failed:', errorMessage);
    throw error;
  } finally {
    if (!syncPass || syncPass.pass === syncPass.totalPasses) {
      isManualSyncRunning = false;
    }
  }
}

export function getSchedulerStatus() {
  return {
    isRunning: syncJob !== null,
    isManualSyncRunning,
    schedule: process.env.NODE_ENV === 'production' ? '0 */4 * * *' : '*/15 * * * *',
    timezone: 'UTC'
  };
}