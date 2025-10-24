import { NextRequest, NextResponse } from 'next/server';
import computeBeetlesLeaderboard from '@/lib/leaderboard-sync';

// Fluid Compute enabled - Pro max duration is 800s (13.3 minutes)
export const maxDuration = 800;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
