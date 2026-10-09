import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAuditLogs } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await getAuditLogs(Math.min(limit, 100));
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Audit logs API error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}
