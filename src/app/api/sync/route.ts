import { NextRequest, NextResponse } from 'next/server';
import { runManualSync, getSchedulerStatus } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    // Check for auth in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await runManualSync();
    return NextResponse.json({
      success: true,
      message: 'Manual sync completed',
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

export async function GET() {
  return NextResponse.json(getSchedulerStatus());
}