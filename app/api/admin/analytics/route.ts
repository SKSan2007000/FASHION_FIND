import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAnalyticsSummary } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const analytics = await getAnalyticsSummary();
    return NextResponse.json({ success: true, analytics });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Analytics API error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics.' }, { status: 500 });
  }
}
