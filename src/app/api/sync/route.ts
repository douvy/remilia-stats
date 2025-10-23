import { NextRequest, NextResponse } from 'next/server';
import { runManualSync, getSchedulerStatus } from '@/lib/scheduler';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Check for auth in production (allow Vercel Cron or Bearer token)
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const userAgent = request.headers.get('user-agent');

      const isVercelCron = userAgent?.includes('vercel-cron/1.0');
      const isValidBearer = authHeader === `Bearer ${process.env.SYNC_SECRET}`;

      if (!isVercelCron && !isValidBearer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check for multi-pass parameters
    const { searchParams } = new URL(request.url);
    const pass = parseInt(searchParams.get('pass') || '1');
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '1000');

    const syncPass = pass > 1 ? { pass, totalPasses: 7, offset, limit } : undefined;

    await runManualSync(syncPass);
    return NextResponse.json({
      success: true,
      message: `Sync pass ${pass} completed`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Manual sync failed:', message);
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Check if this is a Vercel Cron request
  const userAgent = request.headers.get('user-agent');
  const isVercelCron = userAgent?.includes('vercel-cron/1.0');

  if (isVercelCron) {
    // Run sync for Vercel Cron
    try {
      await runManualSync();
      return NextResponse.json({
        success: true,
        message: 'Cron sync completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Cron sync failed:', message);
      return NextResponse.json({
        success: false,
        error: message
      }, { status: 500 });
    }
  }

  // Return status for non-cron GET requests
  return NextResponse.json(getSchedulerStatus());
}