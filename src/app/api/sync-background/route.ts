import { NextRequest, NextResponse } from 'next/server';
import computeBeetlesLeaderboard from '@/lib/leaderboard-sync';

// Fluid Compute enabled - Pro max duration is 800s (13.3 minutes)
export const maxDuration = 800;
export const dynamic = 'force-dynamic';

async function runSync(request: NextRequest) {
  // Only Vercel Cron or bearer token can trigger a sync in production.
  // Unauthenticated hits used to trigger overlapping 13-min syncs -> rate limits.
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');

    const isVercelCron = userAgent?.includes('vercel-cron/1.0');
    const isValidBearer = authHeader === `Bearer ${process.env.SYNC_SECRET}`;

    if (!isVercelCron && !isValidBearer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log('🚀 Starting sync with Fluid Compute (13min limit)...');

    const result = await computeBeetlesLeaderboard();

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      usersProcessed: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Sync failed:', message);

    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return runSync(request);
}

export async function POST(request: NextRequest) {
  return runSync(request);
}
